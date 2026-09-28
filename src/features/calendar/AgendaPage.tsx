import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { navigate, toHash } from '../../app/router';
import { db } from '../../data/db';
import { useDueItems, useEvents, useHorses, useProfessionals } from '../../data/hooks';
import { create, update } from '../../data/repo';
import { CARE_ICONS, CARE_LABELS, EVENT_ICONS, EVENT_LABELS, RECURRENCE_LABELS, options } from '../../domain/labels';
import type { EventType, RecurrenceFreq } from '../../domain/models';
import { Button, Card, ConfirmButton, DueBadge, EmptyState, IconButton, ListRow, PageHeader, Section, SelectField, TextArea, TextField, toast, toastError, Badge } from '../../design/components';
import { addDays, addMonths, endOfMonth, formatDate, formatLong, formatMonth, fromIso, relativeDays, startOfMonth, startOfWeek, todayIso } from '../../lib/dates';
import { formatDuration } from '../../lib/format';
import { setDueState, toggleEventDone } from '../../services/actions';
import { buildIcs, expandEvents, toRrule, type IcsItem, type Occurrence } from '../../services/calendar';
import type { DueItem } from '../../services/reminders';
import { DateField, HorseSelect, ProSelect, SaveBar, toInt } from '../shared';

export function AgendaTab({ path }: { path: string[] }) {
  const [first, second] = path;
  if (first === 'new') return <EventEditPage presetDate={second} />;
  if (first === 'reminders') return <RemindersPage />;
  if (first === 'event' && second) return <EventEditPage id={second} />;
  return <AgendaHome />;
}

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function AgendaHome() {
  const today = todayIso();
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const events = useEvents() ?? [];
  const due = useDueItems() ?? [];
  const horses = useHorses() ?? [];
  const gridStart = startOfWeek(month);
  const gridEnd = addDays(startOfWeek(endOfMonth(month)), 6);
  const occ = useMemo(() => expandEvents(events, gridStart, gridEnd), [events, gridStart, gridEnd]);
  const days = Array.from({ length: Math.round((fromIso(gridEnd).getTime() - fromIso(gridStart).getTime()) / 86_400_000) + 1 }, (_, i) => addDays(gridStart, i));
  const horseName = (id?: string) => horses.find((h) => h.id === id)?.name;
  const dayOcc = occ.filter((o) => o.date === selected);
  const dayDue = due.filter((d) => d.dueDate === selected);
  const overdue = due.filter((d) => d.status === 'overdue');

  return (
    <>
      <PageHeader
        title="Agenda"
        actions={
          <>
            <IconButton icon="bell" label="Rappels" onClick={() => navigate('agenda', 'reminders')} />
            <Button icon="plus" onClick={() => navigate('agenda', 'new', selected)}>Ajouter</Button>
          </>
        }
      />
      {overdue.length > 0 && (
        <Card className="spread" style={{ marginBottom: 'var(--space-5)' }}>
          <span>
            <strong>{overdue.length} soin(s) en retard</strong>
          </span>
          <Button variant="secondary" onClick={() => navigate('agenda', 'reminders')}>Voir</Button>
        </Card>
      )}
      <Card>
        <div className="spread" style={{ marginBottom: 'var(--space-3)' }}>
          <IconButton icon="back" label="Mois précédent" onClick={() => setMonth(addMonths(month, -1))} />
          <strong style={{ textTransform: 'capitalize' }}>{formatMonth(month)}</strong>
          <IconButton icon="chevron" label="Mois suivant" onClick={() => setMonth(addMonths(month, 1))} />
        </div>
        <div className="month">
          {DOW.map((d, i) => (
            <span key={i} className="month__dow" aria-hidden="true">
              {d}
            </span>
          ))}
          {days.map((d) => {
            const n = occ.filter((o) => o.date === d).length;
            const dd = due.filter((x) => x.dueDate === d).length;
            const cls = ['month__day', d.slice(0, 7) !== month.slice(0, 7) && 'month__day--out', d === today && 'month__day--today'].filter(Boolean).join(' ');
            return (
              <button key={d} type="button" className={cls} aria-pressed={d === selected} aria-label={`${formatLong(d)}${n ? `, ${n} événement(s)` : ''}${dd ? `, ${dd} échéance(s)` : ''}`} onClick={() => setSelected(d)}>
                {Number(d.slice(8))}
                <span className="month__dots">
                  {Array.from({ length: Math.min(3, n) }, (_, i) => (
                    <i key={i} />
                  ))}
                  {dd > 0 && <i className="due" />}
                </span>
              </button>
            );
          })}
        </div>
        {month !== startOfMonth(today) && (
          <button type="button" className="link-btn" onClick={() => { setMonth(startOfMonth(today)); setSelected(today); }}>
            Revenir à aujourd’hui
          </button>
        )}
      </Card>

      <Section title={formatLong(selected)}>
        {dayOcc.length || dayDue.length ? (
          <Card className="card--flush">
            {dayOcc.map((o) => (
              <OccurrenceRow key={`${o.event.id}-${o.date}`} o={o} horseName={horseName(o.event.horseId)} />
            ))}
            {dayDue.map((d) => (
              <ListRow key={d.key} icon={CARE_ICONS[d.careType]} title={`${CARE_LABELS[d.careType]} · ${horseName(d.horseId)}`} subtitle={d.source === 'rule' ? 'Échéance estimée' : 'Échéance'} trailing={<DueBadge status={d.status} />} href={toHash('horse', d.horseId, 'care', 'new', d.careType)} />
            ))}
          </Card>
        ) : (
          <p className="small muted">Rien de prévu ce jour-là.</p>
        )}
      </Section>
      <UpcomingList />
    </>
  );
}

function OccurrenceRow({ o, horseName }: { o: Occurrence; horseName?: string }) {
  const e = o.event;
  return (
    <ListRow
      icon={EVENT_ICONS[e.type]}
      title={
        <span style={{ textDecoration: o.done ? 'line-through' : undefined, opacity: o.done ? 0.6 : 1 }}>
          {e.time ? `${e.time.replace(':', 'h')} · ` : ''}
          {e.title}
        </span>
      }
      subtitle={[EVENT_LABELS[e.type], horseName, e.durationMin ? formatDuration(e.durationMin) : undefined, e.recurrence.freq !== 'none' ? RECURRENCE_LABELS[e.recurrence.freq].toLowerCase() : undefined].filter(Boolean).join(' · ')}
      trailing={
        <IconButton
          icon="check"
          label={o.done ? 'Marquer comme à faire' : 'Marquer comme fait'}
          onClick={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            toggleEventDone(e.id, o.date);
          }}
          style={{ color: o.done ? 'var(--color-success)' : 'var(--color-text-muted)' }}
        />
      }
      href={toHash('agenda', 'event', e.id)}
    />
  );
}

function UpcomingList() {
  const today = todayIso();
  const events = useEvents() ?? [];
  const horses = useHorses() ?? [];
  const occ = expandEvents(events, today, addDays(today, 30)).filter((o) => !o.done);
  if (!occ.length) return null;
  return (
    <Section title="30 prochains jours">
      <Card className="card--flush">
        {occ.slice(0, 15).map((o) => (
          <ListRow
            key={`${o.event.id}-${o.date}`}
            icon={EVENT_ICONS[o.event.type]}
            title={o.event.title}
            subtitle={`${formatLong(o.date)}${o.event.time ? ` · ${o.event.time.replace(':', 'h')}` : ''}${o.event.horseId ? ` · ${horses.find((h) => h.id === o.event.horseId)?.name ?? ''}` : ''}`}
            href={toHash('agenda', 'event', o.event.id)}
          />
        ))}
      </Card>
    </Section>
  );
}

// --- Centre de rappels + export Calendrier ------------------------------------------------

function RemindersPage() {
  const due = useDueItems() ?? [];
  const horses = useHorses() ?? [];
  const events = useEvents() ?? [];
  const today = todayIso();
  const name = (id: string) => horses.find((h) => h.id === id)?.name ?? '';

  const exportIcs = async () => {
    const items: IcsItem[] = [
      ...due.map((d) => ({ uid: d.key, title: `${CARE_LABELS[d.careType]} — ${name(d.horseId)}`, date: d.dueDate < today ? today : d.dueDate, description: d.source === 'rule' ? 'Échéance estimée par EQUIFLOW à partir de l’intervalle habituel.' : undefined, alertMin: 15 * 60 /* la veille à 9 h (événement sur la journée) */ })),
      ...events
        .filter((e) => e.recurrence.freq !== 'none' || e.date >= today)
        .map((e) => ({ uid: e.id, title: e.title, date: e.date, time: e.time, durationMin: e.durationMin, description: e.notes, location: e.location, rrule: toRrule(e), alertMin: e.alertMin })),
    ];
    if (!items.length) return toast('Rien à exporter pour le moment.');
    const blob = new Blob([buildIcs(items)], { type: 'text/calendar' });
    const file = new File([blob], 'equiflow-agenda.ics', { type: 'text/calendar' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Agenda EQUIFLOW' });
        return;
      }
    } catch {
      /* partage annulé : repli sur le téléchargement */
    }
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'equiflow-agenda.ics' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Fichier .ics créé : ouvrez-le pour l’ajouter à votre calendrier.');
  };

  const Row = ({ d }: { d: DueItem }) => (
    <Card className="stack" style={{ gap: 'var(--space-2)' }}>
      <div className="spread">
        <strong>
          {CARE_LABELS[d.careType]} · {name(d.horseId)}
        </strong>
        <DueBadge status={d.status} />
      </div>
      <span className="small muted">
        {formatDate(d.dueDate)} ({relativeDays(d.dueDate, today)}) · dernier le {formatDate(d.lastDate)}
        {d.source === 'rule' ? ' · estimée' : ''}
      </span>
      <div className="row row--wrap">
        <Button variant="secondary" icon="plus" onClick={() => navigate('horse', d.horseId, 'care', 'new', d.careType)}>C’est fait</Button>
        <Button variant="ghost" onClick={async () => { await setDueState(d, 'snoozed', addDays(today, 7)); toast('Reporté d’une semaine'); }}>Dans 7 jours</Button>
        <Button variant="ghost" onClick={async () => { await setDueState(d, 'dismissed'); toast('Rappel ignoré pour cette échéance'); }}>Ignorer</Button>
      </div>
    </Card>
  );

  const soon = due.filter((d) => d.status !== 'ok');
  const later = due.filter((d) => d.status === 'ok');
  return (
    <>
      <PageHeader title="Rappels" backHref={toHash('agenda')} />
      <Section title="Calendrier de l’iPhone">
        <Card className="stack">
          <p className="small muted">
            Exportez vos échéances et rendez-vous vers le Calendrier : il vous préviendra même quand EQUIFLOW est fermé. Refaites l’export après avoir ajouté de nouveaux soins.
          </p>
          <Button icon="calendar" onClick={exportIcs}>
            Ajouter au Calendrier (.ics)
          </Button>
        </Card>
      </Section>
      <Section title="À traiter">
        {soon.length ? soon.map((d) => <Row key={d.key} d={d} />) : <p className="small muted">Aucun soin en retard ou imminent.</p>}
      </Section>
      {later.length > 0 && (
        <Section title="Plus tard">
          <Card className="card--flush">
            {later.map((d) => (
              <ListRow key={d.key} icon={CARE_ICONS[d.careType]} title={`${CARE_LABELS[d.careType]} · ${name(d.horseId)}`} subtitle={`${formatDate(d.dueDate)} · ${relativeDays(d.dueDate, today)}`} trailing={<Badge>À jour</Badge>} />
            ))}
          </Card>
        </Section>
      )}
      {!due.length && (
        <EmptyState icon="bell" title="Aucune échéance">
          Enregistrez les derniers soins de votre cheval (vaccin, vermifuge, maréchal…) : EQUIFLOW calcule les suivants.
        </EmptyState>
      )}
    </>
  );
}

// --- Formulaire d'événement ----------------------------------------------------------------

function EventEditPage({ id, presetDate }: { id?: string; presetDate?: string }) {
  const existing = useLiveQuery(() => (id ? db.events.get(id) : undefined), [id]);
  const horses = useHorses() ?? [];
  const pros = useProfessionals() ?? [];
  const [s, setS] = useState<{ type: EventType; title: string; date?: string; time: string; duration: string; horseId?: string; professionalId?: string; location: string; notes: string; freq: RecurrenceFreq; interval: string; until?: string; alert: string }>();
  const [saving, setSaving] = useState(false);
  if (id && existing === undefined) return null;

  const d = s ?? {
    type: existing?.type ?? 'training',
    title: existing?.title ?? '',
    date: existing?.date ?? (presetDate && /^\d{4}-\d{2}-\d{2}$/.test(presetDate) ? presetDate : todayIso()),
    time: existing?.time ?? '',
    duration: existing?.durationMin ? String(existing.durationMin) : '',
    horseId: existing?.horseId ?? horses[0]?.id,
    professionalId: existing?.professionalId,
    location: existing?.location ?? '',
    notes: existing?.notes ?? '',
    freq: existing?.recurrence.freq ?? 'none',
    interval: String(existing?.recurrence.interval ?? 1),
    until: existing?.recurrence.until,
    alert: existing?.alertMin !== undefined ? String(existing.alertMin) : '60',
  };
  const set = (p: Partial<typeof d>) => setS({ ...d, ...p });

  const save = async () => {
    setSaving(true);
    try {
      const data = {
        type: d.type,
        title: d.title.trim() || EVENT_LABELS[d.type],
        date: d.date ?? todayIso(),
        time: d.time || undefined,
        durationMin: toInt(d.duration),
        horseId: d.horseId,
        professionalId: d.professionalId,
        location: d.location,
        notes: d.notes,
        recurrence: { freq: d.freq, interval: toInt(d.interval) ?? 1, until: d.freq === 'none' ? undefined : d.until },
        alertMin: d.alert === '' ? undefined : Number(d.alert),
        doneDates: existing?.doneDates ?? [],
      };
      if (existing) await update('events', existing.id, data);
      else await create('events', data);
      toast(existing ? 'Événement mis à jour' : 'Ajouté à l’agenda');
      navigate('agenda');
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={existing ? 'Événement' : 'Nouvel événement'} backHref={toHash('agenda')} />
      <div className="form">
        <SelectField label="Type" value={d.type} onChange={(e) => set({ type: e.target.value as EventType })} options={options(EVENT_LABELS)} />
        <TextField label="Titre" value={d.title} placeholder={EVENT_LABELS[d.type]} onChange={(e) => set({ title: e.target.value })} />
        <div className="form-row">
          <DateField label="Date" value={d.date} onChange={(v) => set({ date: v })} />
          <TextField label="Heure" type="time" value={d.time} onChange={(e) => set({ time: e.target.value })} hint="Vide = toute la journée" />
        </div>
        <TextField label="Durée (min)" inputMode="numeric" value={d.duration} onChange={(e) => set({ duration: e.target.value.replace(/\D/g, '') })} />
        <SelectField label="Répétition" value={d.freq} onChange={(e) => set({ freq: e.target.value as RecurrenceFreq })} options={options(RECURRENCE_LABELS)} />
        {d.freq !== 'none' && (
          <div className="form-row">
            <TextField label="Toutes les" inputMode="numeric" value={d.interval} onChange={(e) => set({ interval: e.target.value.replace(/\D/g, '').slice(0, 2) })} hint={d.freq === 'weekly' ? 'semaines' : d.freq === 'monthly' ? 'mois' : d.freq === 'yearly' ? 'ans' : 'jours'} />
            <DateField label="Jusqu’au" value={d.until} onChange={(v) => set({ until: v })} />
          </div>
        )}
        {horses.length > 0 && <HorseSelect horses={horses} value={d.horseId} allowNone onChange={(v) => set({ horseId: v })} />}
        <ProSelect pros={pros} value={d.professionalId} onChange={(v) => set({ professionalId: v })} />
        <TextField label="Lieu" value={d.location} onChange={(e) => set({ location: e.target.value })} />
        <SelectField
          label="Alerte (export Calendrier)"
          value={d.alert}
          onChange={(e) => set({ alert: e.target.value })}
          options={[
            { value: '', label: 'Aucune' },
            { value: '0', label: 'À l’heure de l’événement' },
            { value: '30', label: '30 min avant' },
            { value: '60', label: '1 h avant' },
            { value: '1440', label: 'La veille' },
            { value: '2880', label: '2 jours avant' },
          ]}
        />
        <TextArea label="Notes" value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
        {existing && (
          <ConfirmButton
            onConfirm={async () => {
              await db.events.delete(existing.id);
              toast('Événement supprimé');
              navigate('agenda');
            }}
          >
            Supprimer {existing.recurrence.freq !== 'none' ? 'toutes les occurrences' : 'l’événement'}
          </ConfirmButton>
        )}
      </div>
      <SaveBar onSave={save} saving={saving} />
    </>
  );
}
