import { useState } from 'react';
import { navigate, toHash } from '../../app/router';
import { setSetting } from '../../data/repo';
import { useActiveHorse, useHorses, useProfile, useSessions, useSetting, WEEKLY_GOAL_KEY } from '../../data/hooks';
import { DISCIPLINE_LABELS, SESSION_TYPE_LABELS } from '../../domain/labels';
import type { TrainingSession } from '../../domain/models';
import { BottomSheet, Button, Card, EmptyState, Icon, ListRow, PageHeader, ProgressBar, Section, StatTile, toast } from '../../design/components';
import { addDays, formatLong, formatShort, startOfWeek, todayIso } from '../../lib/dates';
import { formatDuration, plural } from '../../lib/format';
import { addPlanToAgenda } from '../../services/actions';
import { planWeek } from '../../services/ai/planner';
import { loadLive } from '../../services/liveSession';
import { weekSummary, weeklyStreak } from '../../services/progress';
import { HorseSelect } from '../shared';
import { LiveSessionPage } from './LiveSession';
import { ProgressPage } from './ProgressPage';
import { SessionEditPage } from './SessionForm';

export function SessionsTab({ path }: { path: string[] }) {
  const [first] = path;
  if (first === 'new') return <SessionEditPage />;
  if (first === 'repeat') return <SessionEditPage repeatLast />;
  if (first === 'live') return <LiveSessionPage />;
  if (first === 'progress') return <ProgressPage />;
  if (first) return <SessionEditPage id={first} />;
  return <SessionsHome />;
}

function SessionsHome() {
  const { horse, horses } = useActiveHorse();
  const [horseId, setHorseId] = useState<string | undefined>();
  const selected = horseId ?? horse?.id;
  const all = useSessions() ?? [];
  const sessions = selected ? all.filter((s) => s.horseId === selected) : all;
  const goal = useSetting<number>(WEEKLY_GOAL_KEY, 3);
  const today = todayIso();
  const week = weekSummary(sessions, today);
  const streak = weeklyStreak(sessions, today);
  const live = loadLive();
  const [goalOpen, setGoalOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  if (!horses.length)
    return (
      <>
        <PageHeader title="Mes séances" />
        <EmptyState icon="activity" title="Ajoutez d’abord un cheval" action={<Button icon="plus" onClick={() => navigate('horse', 'new')}>Ajouter un cheval</Button>}>
          Les séances sont rattachées à un cheval.
        </EmptyState>
      </>
    );

  return (
    <>
      <PageHeader title="Mes séances" actions={<Button variant="ghost" icon="chart" onClick={() => navigate('sessions', 'progress')}>Progression</Button>} />
      {horses.length > 1 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <HorseSelect horses={horses} value={selected} onChange={setHorseId} />
        </div>
      )}

      <Section>
        {live ? (
          <Button size="lg" block icon="clock" onClick={() => navigate('sessions', 'live')}>
            Reprendre la séance en cours
          </Button>
        ) : (
          <Button size="lg" block icon="play" onClick={() => navigate('sessions', 'live')}>
            Démarrer une séance
          </Button>
        )}
        <div className="form-row">
          <Button variant="secondary" icon="plus" onClick={() => navigate('sessions', 'new')}>
            Saisir
          </Button>
          <Button variant="secondary" icon="repeat" disabled={!sessions.length} onClick={() => navigate('sessions', 'repeat')}>
            Refaire la dernière
          </Button>
        </div>
      </Section>

      <Section title="Cette semaine" action={<button type="button" className="link-btn" onClick={() => setGoalOpen(true)}>Objectif : {goal}/sem.</button>}>
        <Card className="stack">
          <div className="spread">
            <strong>{plural(week.count, 'séance', 'séances')} sur {goal}</strong>
            <span className="small muted">{formatDuration(week.minutes)}</span>
          </div>
          <ProgressBar value={week.count} max={goal} label="Objectif de la semaine" />
          <span className="small muted">
            {week.count >= goal ? 'Objectif atteint, bravo !' : `Encore ${goal - week.count} pour atteindre votre objectif.`} Semaine dernière : {plural(week.previousCount, 'séance', 'séances')}.
          </span>
        </Card>
        <div className="stat-grid">
          <StatTile label="Régularité" value={`${streak} sem.`} hint="consécutives avec au moins une séance" />
          <StatTile label="Total" value={String(sessions.length)} hint={formatDuration(sessions.reduce((m, s) => m + s.durationMin, 0))} />
        </div>
        {horse && (
          <Button variant="secondary" icon="sparkle" onClick={() => setPlanOpen(true)}>
            Programme de la semaine
          </Button>
        )}
      </Section>

      <SessionList horseId={selected} hideEmptyAction />

      <GoalSheet open={goalOpen} current={goal} onClose={() => setGoalOpen(false)} />
      {planOpen && horse && <PlanSheet horseId={selected ?? horse.id} onClose={() => setPlanOpen(false)} />}
    </>
  );
}

function GoalSheet({ open, current, onClose }: { open: boolean; current: number; onClose: () => void }) {
  return (
    <BottomSheet open={open} title="Objectif hebdomadaire" onClose={onClose}>
      <div className="rating" role="radiogroup" aria-label="Séances par semaine">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={current === n}
            className={current === n ? 'rating__dot rating__dot--on' : 'rating__dot'}
            onClick={async () => {
              await setSetting(WEEKLY_GOAL_KEY, n);
              onClose();
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 'var(--space-3)' }}>Nombre de séances visé chaque semaine, tous exercices confondus.</p>
    </BottomSheet>
  );
}

function PlanSheet({ horseId, onClose }: { horseId: string; onClose: () => void }) {
  const horses = useHorses() ?? [];
  const profile = useProfile();
  const sessions = useSessions(horseId) ?? [];
  const horse = horses.find((h) => h.id === horseId);
  if (!horse) return null;
  const plan = planWeek(horse, profile?.goals ?? [], sessions, todayIso());
  return (
    <BottomSheet open title={`Programme · ${horse.name}`} onClose={onClose}>
      <div className="stack">
        {plan.blocked ? (
          <p>{plan.blocked}</p>
        ) : (
          <>
            <Card className="card--flush">
              {plan.items.map((i) => (
                <ListRow key={i.date} icon="activity" title={`${formatLong(i.date)} — ${formatDuration(i.durationMin)}`} subtitle={`${i.title}. ${i.notes ?? ''}`} />
              ))}
            </Card>
            {plan.notes.map((n) => (
              <p key={n} className="small muted">
                <Icon name="sparkle" size={14} /> {n}
              </p>
            ))}
            <Button
              block
              icon="calendar"
              onClick={async () => {
                const n = await addPlanToAgenda(horse.id, plan.items);
                toast(`${n} séances ajoutées à l’agenda`);
                onClose();
              }}
            >
              Ajouter à l’agenda
            </Button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/** Timeline des séances groupées par semaine. */
export function SessionList({ horseId, hideEmptyAction }: { horseId?: string; hideEmptyAction?: boolean }) {
  const all = useSessions() ?? [];
  const horses = useHorses() ?? [];
  const sessions = horseId ? all.filter((s) => s.horseId === horseId) : all;
  if (!sessions.length)
    return (
      <EmptyState icon="activity" title="Aucune séance" action={hideEmptyAction ? undefined : <Button icon="plus" onClick={() => navigate('sessions', 'new')}>Ajouter une séance</Button>}>
        Durée, allures, exercices, ressentis : votre historique d’entraînement commence ici.
      </EmptyState>
    );
  const weeks = [...new Set(sessions.map((s) => startOfWeek(s.date)))];
  const today = todayIso();
  const label = (w: string) => (w === startOfWeek(today) ? 'Cette semaine' : w === addDays(startOfWeek(today), -7) ? 'Semaine dernière' : `Semaine du ${formatShort(w)}`);
  return (
    <Section title="Historique">
      {weeks.slice(0, 26).map((w) => {
        const list = sessions.filter((s) => startOfWeek(s.date) === w);
        return (
          <div key={w}>
            <div className="day-head spread">
              <span>{label(w)}</span>
              <span>
                {plural(list.length, 'séance', 'séances')} · {formatDuration(list.reduce((m, s) => m + s.durationMin, 0))}
              </span>
            </div>
            <Card className="card--flush">
              {list.map((s) => (
                <SessionRow key={s.id} s={s} horseName={horseId ? undefined : horses.find((h) => h.id === s.horseId)?.name} />
              ))}
            </Card>
          </div>
        );
      })}
    </Section>
  );
}

function SessionRow({ s, horseName }: { s: TrainingSession; horseName?: string }) {
  return (
    <ListRow
      icon="activity"
      title={`${formatShort(s.date)} · ${DISCIPLINE_LABELS[s.discipline]}`}
      subtitle={[formatDuration(s.durationMin), SESSION_TYPE_LABELS[s.sessionType], horseName, s.exercises.slice(0, 2).join(', '), s.fileIds.length ? `${s.fileIds.length} média(s)` : undefined].filter(Boolean).join(' · ')}
      href={toHash('sessions', s.id)}
    />
  );
}
