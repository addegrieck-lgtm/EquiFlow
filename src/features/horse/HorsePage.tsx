import { useState } from 'react';
import { navigate, toHash } from '../../app/router';
import { useFileUrl } from '../../data/files';
import { setActiveHorse, useActiveHorse, useCareRecords, useDueItems, useExpenses, useHorse, useProfessionals, useReminderRules, useSessions } from '../../data/hooks';
import { create, update } from '../../data/repo';
import { CARE_ICONS, CARE_LABELS, DISCIPLINE_LABELS, HORSE_STATUS_LABELS, LEVEL_LABELS, SEX_LABELS } from '../../domain/labels';
import type { CareRecord, CareType, Horse } from '../../domain/models';
import { Badge, BottomSheet, Button, Card, DueBadge, EmptyState, IconButton, ListRow, PageHeader, Section, StatTile, TextField, toast } from '../../design/components';
import { ageFromYear, formatDate, relativeDays, todayIso } from '../../lib/dates';
import { formatDuration, formatMoney } from '../../lib/format';
import { expandExpenses, filterOccurrences, realMonthlyCost, sumCents } from '../../services/expenses';
import { DEFAULT_RULES, ruleFor, type DueItem } from '../../services/reminders';
import { toInt } from '../shared';
import { CareEditPage } from './CareForm';
import { HorseDocuments, DocumentViewPage } from '../documents/Documents';
import { HorseEditPage } from './HorseForm';
import { SessionList } from '../sessions/SessionsPage';
import { ExpenseList } from '../expenses/ExpensesPage';

const SECTIONS = [
  ['overview', 'Aperçu'],
  ['health', 'Santé'],
  ['care', 'Soins'],
  ['documents', 'Documents'],
  ['expenses', 'Dépenses'],
  ['sessions', 'Séances'],
] as const;
type SectionId = (typeof SECTIONS)[number][0];

const HEALTH_TYPES: CareType[] = ['vaccination', 'deworming', 'treatment', 'vet_visit'];
const CARE_TYPES_SECTION: CareType[] = ['farrier', 'dental', 'osteopath', 'massage', 'other'];

/** Routeur de l'onglet Cheval. */
export function HorseTab({ path }: { path: string[] }) {
  const [first, second, third, fourth] = path;
  if (first === 'new') return <HorseEditPage />;
  if (!first) return <ActiveHorse />;
  if (second === 'edit') return <HorseEditPage id={first} />;
  if (second === 'care' && third) return <CareEditPage horseId={first} recordId={third === 'new' ? undefined : third} initialType={third === 'new' ? (fourth as CareType | undefined) : undefined} />;
  if (second === 'doc' && third) return <DocumentViewPage id={third} backHref={toHash('horse', first, 'documents')} />;
  return <HorseDetail id={first} section={(second as SectionId) || 'overview'} />;
}

function ActiveHorse() {
  const { horse, horses, loading } = useActiveHorse();
  if (loading) return null;
  if (!horse)
    return (
      <>
        <PageHeader title="Mon cheval" />
        <EmptyState icon="horseshoe" title="Ajoutez votre premier cheval" action={<Button icon="plus" onClick={() => navigate('horse', 'new')}>Ajouter un cheval</Button>}>
          Photo, race, âge, discipline : son dossier complet commence ici.
        </EmptyState>
      </>
    );
  return <HorseDetail id={horse.id} section="overview" horses={horses} />;
}

function HorseSwitcher({ horses, current }: { horses: Horse[]; current: Horse }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon="repeat" label="Changer de cheval" onClick={() => setOpen(true)} />
      <BottomSheet open={open} title="Mes chevaux" onClose={() => setOpen(false)}>
        <Card className="card--flush">
          {horses.map((h) => (
            <ListRow
              key={h.id}
              title={h.name}
              subtitle={HORSE_STATUS_LABELS[h.status]}
              trailing={h.id === current.id ? <Badge tone="brand">Actif</Badge> : undefined}
              onClick={async () => {
                await setActiveHorse(h.id);
                setOpen(false);
                navigate('horse', h.id);
              }}
            />
          ))}
        </Card>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button block variant="secondary" icon="plus" onClick={() => { setOpen(false); navigate('horse', 'new'); }}>
            Ajouter un cheval
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}

function HorseDetail({ id, section, horses: horsesProp }: { id: string; section: SectionId; horses?: Horse[] }) {
  const horse = useHorse(id);
  const { horses } = useActiveHorse();
  const photo = useFileUrl(horse?.photoFileId);
  if (horse === undefined) return null;
  const today = todayIso();
  const age = ageFromYear(horse.birthYear, today);
  const list = horsesProp ?? horses;

  return (
    <>
      <PageHeader
        title={horse.name}
        eyebrow="Mon cheval"
        actions={
          <>
            {list.length > 1 && <HorseSwitcher horses={list} current={horse} />}
            <IconButton icon="edit" label="Modifier la fiche" onClick={() => navigate('horse', horse.id, 'edit')} />
          </>
        }
      />
      {section === 'overview' && (
        <div className="horse-hero" style={{ marginBottom: 'var(--space-5)' }}>
          {photo && <img src={photo} alt={`Photo de ${horse.name}`} />}
          <div className="horse-hero__shade">
            <div className="horse-hero__name">{horse.name}</div>
            <div className="small">
              {[age !== undefined ? `${age} ans` : undefined, horse.breed, horse.discipline ? DISCIPLINE_LABELS[horse.discipline] : undefined].filter(Boolean).join(' · ') || 'Complétez sa fiche'}
            </div>
          </div>
        </div>
      )}
      <nav className="tabs" aria-label="Sections du dossier">
        {SECTIONS.map(([sid, label]) => (
          <a key={sid} href={toHash('horse', horse.id, sid === 'overview' ? undefined : sid)} aria-current={sid === section ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
      {section === 'overview' && <Overview horse={horse} />}
      {section === 'health' && <CareGroups horse={horse} types={HEALTH_TYPES} />}
      {section === 'care' && <CareGroups horse={horse} types={CARE_TYPES_SECTION} />}
      {section === 'documents' && <HorseDocuments horse={horse} />}
      {section === 'expenses' && <ExpenseList horseId={horse.id} />}
      {section === 'sessions' && <SessionList horseId={horse.id} />}
    </>
  );
}

function Overview({ horse }: { horse: Horse }) {
  const due = (useDueItems() ?? []).filter((d) => d.horseId === horse.id);
  const expenses = useExpenses() ?? [];
  const sessions = useSessions(horse.id) ?? [];
  const today = todayIso();
  const occ = filterOccurrences(expandExpenses(expenses, today), { horseId: horse.id });
  const cost = realMonthlyCost(occ, today);
  const yearTotal = sumCents(filterOccurrences(occ, { from: `${today.slice(0, 4)}-01-01` }));
  const age = ageFromYear(horse.birthYear, today);

  const facts: [string, string | undefined][] = [
    ['Âge', age !== undefined ? `${age} ans (${horse.birthYear})` : undefined],
    ['Sexe', horse.sex ? SEX_LABELS[horse.sex] : undefined],
    ['Race', horse.breed],
    ['Robe', horse.color],
    ['Taille', horse.heightCm ? `${horse.heightCm} cm` : undefined],
    ['Discipline', horse.discipline ? DISCIPLINE_LABELS[horse.discipline] : undefined],
    ['Niveau', horse.level ? LEVEL_LABELS[horse.level] : undefined],
    ['Lieu', horse.location],
    ['UELN / SIRE', horse.ueln],
    ['Puce', horse.microchip],
    ['Statut', HORSE_STATUS_LABELS[horse.status]],
  ];

  return (
    <>
      <Section title="Prochaines échéances">
        {due.length ? (
          <Card className="card--flush">
            {due.slice(0, 5).map((d) => (
              <DueRow key={d.key} item={d} />
            ))}
          </Card>
        ) : (
          <EmptyState icon="bell" title="Aucune échéance calculée">
            Enregistrez le dernier vaccin, vermifuge ou passage du maréchal : les prochaines dates seront calculées automatiquement.
          </EmptyState>
        )}
      </Section>
      <Section title="En chiffres">
        <div className="stat-grid">
          <StatTile label="Coût mensuel moyen" value={cost.months ? formatMoney(cost.totalCents, 'EUR', false) : '—'} hint={cost.months ? `sur ${cost.months} mois` : 'Aucune dépense'} />
          <StatTile label={`Dépenses ${today.slice(0, 4)}`} value={formatMoney(yearTotal, 'EUR', false)} />
          <StatTile label="Séances" value={String(sessions.length)} hint={sessions[0] ? `dernière ${relativeDays(sessions[0].date, today)}` : undefined} />
          <StatTile label="Temps monté" value={formatDuration(sessions.reduce((m, s) => m + s.durationMin, 0))} />
        </div>
      </Section>
      <Section title="Informations" action={<a className="link-btn" href={toHash('horse', horse.id, 'edit')}>Modifier</a>}>
        <Card>
          <dl className="kv">
            {facts
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {horse.notes && <p className="small" style={{ marginTop: 'var(--space-3)', whiteSpace: 'pre-wrap' }}>{horse.notes}</p>}
        </Card>
      </Section>
    </>
  );
}

export function DueRow({ item, showHorse }: { item: DueItem; showHorse?: string }) {
  const today = todayIso();
  return (
    <ListRow
      icon={CARE_ICONS[item.careType]}
      title={`${CARE_LABELS[item.careType]}${showHorse ? ` · ${showHorse}` : ''}`}
      subtitle={`${formatDate(item.dueDate)} · ${relativeDays(item.dueDate, today)}${item.source === 'rule' ? ' · estimée' : ''}`}
      trailing={<DueBadge status={item.status} />}
      href={toHash('horse', item.horseId, 'care', 'new', item.careType)}
    />
  );
}

function CareGroups({ horse, types }: { horse: Horse; types: CareType[] }) {
  const records = useCareRecords(horse.id) ?? [];
  const due = (useDueItems() ?? []).filter((d) => d.horseId === horse.id);
  const rules = useReminderRules() ?? [];
  const pros = useProfessionals() ?? [];
  const [ruleType, setRuleType] = useState<CareType>();

  return (
    <>
      {types.map((type) => {
        const list = records.filter((r) => r.type === type);
        const d = due.find((x) => x.careType === type);
        const rule = ruleFor(horse.id, type, rules);
        return (
          <Section
            key={type}
            title={CARE_LABELS[type]}
            action={
              <button type="button" className="link-btn" onClick={() => navigate('horse', horse.id, 'care', 'new', type)}>
                + Ajouter
              </button>
            }
          >
            {d && (
              <Card className="spread">
                <div>
                  <strong>Prochaine échéance : {formatDate(d.dueDate)}</strong>
                  <div className="small muted">{relativeDays(d.dueDate, todayIso())}{d.source === 'rule' ? ' · estimée d’après l’intervalle' : ' · date saisie'}</div>
                </div>
                <DueBadge status={d.status} />
              </Card>
            )}
            {list.length ? (
              <Card className="card--flush">
                {list.slice(0, 6).map((r) => (
                  <CareRow key={r.id} record={r} proName={pros.find((p) => p.id === r.professionalId)?.name} />
                ))}
              </Card>
            ) : (
              <p className="small muted">Aucun enregistrement.</p>
            )}
            {(DEFAULT_RULES[type] || rules.some((r) => r.horseId === horse.id && r.careType === type)) && (
              <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setRuleType(type)}>
                {rule ? `Rappel tous les ${rule.intervalDays} jours · modifier` : 'Rappel désactivé · modifier'}
              </button>
            )}
          </Section>
        );
      })}
      {ruleType && <RuleSheet horse={horse} type={ruleType} onClose={() => setRuleType(undefined)} />}
    </>
  );
}

function CareRow({ record: r, proName }: { record: CareRecord; proName?: string }) {
  const detail = [r.title, r.details.product, r.details.shoeing, proName].filter(Boolean).join(' · ');
  return <ListRow icon={CARE_ICONS[r.type]} title={formatDate(r.date)} subtitle={detail || CARE_LABELS[r.type]} href={toHash('horse', r.horseId, 'care', r.id)} />;
}

function RuleSheet({ horse, type, onClose }: { horse: Horse; type: CareType; onClose: () => void }) {
  const rules = useReminderRules() ?? [];
  const existing = rules.find((r) => r.horseId === horse.id && r.careType === type);
  const base = existing ?? { ...DEFAULT_RULES[type], enabled: true };
  const [interval, setInterval] = useState(String(base.intervalDays ?? 365));
  const [notice, setNotice] = useState(String(base.noticeDays ?? 14));

  const save = async (enabled: boolean) => {
    const data = { horseId: horse.id, careType: type, intervalDays: toInt(interval) ?? 365, noticeDays: toInt(notice) ?? 14, enabled };
    if (existing) await update('reminderRules', existing.id, data);
    else await create('reminderRules', data);
    toast('Rappel mis à jour');
    onClose();
  };

  return (
    <BottomSheet open title={`Rappel · ${CARE_LABELS[type]}`} onClose={onClose}>
      <div className="form">
        <p className="small muted">Repère courant, à ajuster selon les conseils de votre vétérinaire ou de votre professionnel.</p>
        <TextField label="Intervalle (jours)" inputMode="numeric" value={interval} onChange={(e) => setInterval(e.target.value.replace(/\D/g, ''))} />
        <TextField label="Prévenir combien de jours avant" inputMode="numeric" value={notice} onChange={(e) => setNotice(e.target.value.replace(/\D/g, ''))} />
        <Button block onClick={() => save(true)}>
          Enregistrer
        </Button>
        <Button block variant="ghost" onClick={() => save(false)}>
          Désactiver ce rappel
        </Button>
      </div>
    </BottomSheet>
  );
}
