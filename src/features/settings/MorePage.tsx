import { useState } from 'react';
import { toHash } from '../../app/router';
import { useDueItems, useProfile, useSetting } from '../../data/hooks';
import { update } from '../../data/repo';
import { GOAL_LABELS, LEVEL_LABELS, ROLE_LABELS, options } from '../../domain/labels';
import { GOALS, ROLES, type Goal, type Level, type Role } from '../../domain/models';
import { Badge, Card, Chip, ListRow, PageHeader, Section, SelectField, TextField, toast, toastError } from '../../design/components';
import { HomeLocationCard } from '../pros/ProsPage';
import { SaveBar } from '../shared';
import { PIN_KEY } from '../../services/pin';
import { BackupPage, LAST_BACKUP_KEY } from './BackupPage';
import { DesignSystemPage } from './DesignSystemPage';
import { SecurityPage } from './SecurityPage';
import { ThemePicker } from './ThemePicker';
import { ExpensesRoute } from '../expenses/ExpensesPage';
import { ProsRoute } from '../pros/ProsPage';
import { NearbyPage } from '../pros/NearbyPage';
import { formatDate, diffDays, todayIso } from '../../lib/dates';

export function MoreTab({ path }: { path: string[] }) {
  const [first, ...rest] = path;
  switch (first) {
    case 'design':
      return <DesignSystemPage />;
    case 'expenses':
      return <ExpensesRoute path={rest} />;
    case 'pros':
      return <ProsRoute path={rest} />;
    case 'nearby':
      return <NearbyPage kind={rest[0]} />;
    case 'backup':
      return <BackupPage />;
    case 'security':
      return <SecurityPage />;
    case 'profile':
      return <ProfilePage />;
    case 'location':
      return (
        <>
          <PageHeader title="Position de référence" backHref={toHash('more')} />
          <HomeLocationCard />
        </>
      );
    default:
      return <MorePage />;
  }
}

function MorePage() {
  const profile = useProfile();
  const due = useDueItems() ?? [];
  const hasPin = Boolean(useSetting<unknown>(PIN_KEY, undefined));
  const lastBackup = useSetting<string | undefined>(LAST_BACKUP_KEY, undefined);
  const backupLate = !lastBackup || diffDays(lastBackup.slice(0, 10), todayIso()) > 30;
  const pending = due.filter((d) => d.status !== 'ok').length;

  return (
    <>
      <PageHeader title="Plus" />
      <Section title="Suivi">
        <Card className="card--flush">
          <ListRow icon="euro" title="Mes dépenses" subtitle="Budget, coût réel du cheval" href={toHash('more', 'expenses')} />
          <ListRow icon="pro" title="Mes professionnels" subtitle="Carnet, pros autour de moi" href={toHash('more', 'pros')} />
          <ListRow icon="bell" title="Rappels" subtitle="Échéances, export Calendrier" trailing={pending ? <Badge tone="warning">{pending}</Badge> : undefined} href={toHash('agenda', 'reminders')} />
          <ListRow icon="sparkle" title="EQUIFLOW AI" subtitle="Posez vos questions" href={toHash('ai')} />
          <ListRow icon="search" title="Rechercher" subtitle="Dans tout le dossier" href={toHash('search')} />
        </Card>
      </Section>

      <Section title="Mon compte">
        <Card className="card--flush">
          <ListRow icon="user" title={profile?.firstName ?? 'Profil'} subtitle={profile ? ROLE_LABELS[profile.role].replace('Je suis ', '').replace('Je gère ', '') : undefined} href={toHash('more', 'profile')} />
          <ListRow icon="pin" title="Position de référence" subtitle="Pour trier les pros par distance" href={toHash('more', 'location')} />
          <ListRow icon="lock" title="Code de verrouillage" trailing={<Badge tone={hasPin ? 'success' : 'neutral'}>{hasPin ? 'Activé' : 'Désactivé'}</Badge>} href={toHash('more', 'security')} />
        </Card>
      </Section>

      <Section title="Apparence">
        <ThemePicker />
      </Section>

      <Section title="Mes données">
        <Card className="card--flush">
          <ListRow icon="shield" title="Confidentialité" subtitle="Vos données restent sur cet appareil. Aucun serveur, aucun traceur." />
          <ListRow
            icon="download"
            title="Sauvegarde et export"
            subtitle={lastBackup ? `Dernière sauvegarde : ${formatDate(lastBackup.slice(0, 10))}` : 'Aucune sauvegarde pour l’instant'}
            trailing={backupLate ? <Badge tone="warning">À faire</Badge> : undefined}
            href={toHash('more', 'backup')}
          />
        </Card>
      </Section>

      <Section title="À propos">
        <Card className="card--flush">
          <ListRow icon="palette" title="Design system" subtitle="Couleurs, typographie, composants" href={toHash('more', 'design')} />
          <ListRow icon="info" title="EQUIFLOW" subtitle={`Version ${import.meta.env.VITE_APP_VERSION} · bêta`} />
        </Card>
        <p className="small muted">
          EQUIFLOW aide à organiser le suivi de votre cheval. Il ne remplace pas l’avis d’un vétérinaire ni d’un professionnel qualifié. Recherche « autour de moi » : données © contributeurs
          OpenStreetMap.
        </p>
      </Section>
    </>
  );
}

function ProfilePage() {
  const profile = useProfile();
  const [s, setS] = useState<{ firstName: string; role: Role; level?: Level; goals: Goal[] }>();
  const [saving, setSaving] = useState(false);
  if (!profile) return null;
  const d = s ?? { firstName: profile.firstName, role: profile.role, level: profile.level, goals: profile.goals };
  const set = (p: Partial<typeof d>) => setS({ ...d, ...p });
  const save = async () => {
    setSaving(true);
    try {
      await update('profiles', profile.id, d);
      toast('Profil mis à jour');
      setS(undefined);
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeader title="Mon profil" backHref={toHash('more')} />
      <div className="form">
        <TextField label="Prénom" value={d.firstName} onChange={(e) => set({ firstName: e.target.value })} />
        <SelectField label="Profil" value={d.role} onChange={(e) => set({ role: e.target.value as Role })} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
        <SelectField label="Mon niveau" value={d.level ?? ''} onChange={(e) => set({ level: (e.target.value || undefined) as Level })} options={[{ value: '', label: '—' }, ...options(LEVEL_LABELS)]} />
        <div className="field">
          <span className="field__label">Objectifs</span>
          <div className="chips">
            {GOALS.map((g) => (
              <Chip key={g} selected={d.goals.includes(g)} onToggle={() => set({ goals: d.goals.includes(g) ? d.goals.filter((x) => x !== g) : [...d.goals, g] })}>
                {GOAL_LABELS[g]}
              </Chip>
            ))}
          </div>
        </div>
      </div>
      {s && <SaveBar onSave={save} saving={saving} />}
    </>
  );
}
