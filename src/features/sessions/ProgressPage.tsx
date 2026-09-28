import { useState } from 'react';
import { toHash } from '../../app/router';
import { useActiveHorse, useProfile, useSessions, useSetting, WEEKLY_GOAL_KEY } from '../../data/hooks';
import { DISCIPLINE_LABELS, GOAL_LABELS } from '../../domain/labels';
import { BarChart, Card, EmptyState, HBarList, PageHeader, Section, Segmented, StatTile, Badge } from '../../design/components';
import { formatShort, lastMonths, formatMonthShort, formatMonth, monthKey, todayIso } from '../../lib/dates';
import { formatDuration, plural } from '../../lib/format';
import { averageFeeling, disciplineBreakdown, gaitTotals, weeklySeries, weeklyStreak } from '../../services/progress';
import { HorseSelect } from '../shared';

/** Progression du cheval et du cavalier (SPEC §14). */
export function ProgressPage() {
  const [tab, setTab] = useState<'horse' | 'rider'>('horse');
  return (
    <>
      <PageHeader title="Progression" backHref={toHash('sessions')} />
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <Segmented label="Vue" hideLabel value={tab} onChange={setTab} options={[{ value: 'horse', label: 'Mon cheval' }, { value: 'rider', label: 'Moi, cavalier' }]} />
      </div>
      {tab === 'horse' ? <HorseProgress /> : <RiderProgress />}
    </>
  );
}

function HorseProgress() {
  const { horse, horses } = useActiveHorse();
  const [horseId, setHorseId] = useState<string>();
  const id = horseId ?? horse?.id;
  const sessions = useSessions(id) ?? [];
  const today = todayIso();
  if (!id) return <EmptyState icon="horseshoe" title="Aucun cheval" />;
  const weeks = weeklySeries(sessions, 8, today);
  const gaits = gaitTotals(sessions);
  const gaitSum = gaits.walk + gaits.trot + gaits.canter;
  const disc = disciplineBreakdown(sessions);
  const hf = averageFeeling(sessions.slice(0, 10), 'horseFeeling');

  return (
    <>
      {horses.length > 1 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <HorseSelect horses={horses} value={id} onChange={setHorseId} />
        </div>
      )}
      {!sessions.length ? (
        <EmptyState icon="chart" title="Pas encore de données">Enregistrez quelques séances : les graphiques apparaîtront ici.</EmptyState>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 'var(--space-6)' }}>
            <StatTile label="Séances" value={String(sessions.length)} />
            <StatTile label="Temps total" value={formatDuration(sessions.reduce((m, s) => m + s.durationMin, 0))} />
            <StatTile label="Ressenti récent" value={hf ? `${String(hf).replace('.', ',')}/5` : '—'} hint="10 dernières séances" />
            <StatTile label="Durée moyenne" value={formatDuration(Math.round(sessions.reduce((m, s) => m + s.durationMin, 0) / sessions.length))} />
          </div>
          <Section title="Minutes par semaine">
            <Card>
              <BarChart
                summary={`Minutes montées par semaine sur 8 semaines : ${weeks.map((w) => w.minutes).join(', ')}`}
                data={weeks.map((w, i) => ({ label: formatShort(w.week).replace('.', ''), value: w.minutes, title: `Semaine du ${formatShort(w.week)} : ${plural(w.count, 'séance', 'séances')}, ${formatDuration(w.minutes)}`, highlight: i === weeks.length - 1 }))}
              />
            </Card>
          </Section>
          {gaitSum > 0 && (
            <Section title="Répartition des allures">
              <Card>
                <HBarList
                  items={[
                    { label: 'Pas', value: gaits.walk, display: `${Math.round((gaits.walk / gaitSum) * 100)} %` },
                    { label: 'Trot', value: gaits.trot, display: `${Math.round((gaits.trot / gaitSum) * 100)} %` },
                    { label: 'Galop', value: gaits.canter, display: `${Math.round((gaits.canter / gaitSum) * 100)} %` },
                  ]}
                />
              </Card>
            </Section>
          )}
          <Section title="Disciplines">
            <Card>
              <HBarList items={disc.map((d) => ({ label: DISCIPLINE_LABELS[d.discipline], value: d.minutes, display: `${plural(d.count, 'séance', 'séances')} · ${formatDuration(d.minutes)}` }))} />
            </Card>
          </Section>
        </>
      )}
    </>
  );
}

function RiderProgress() {
  const sessions = useSessions() ?? [];
  const profile = useProfile();
  const goal = useSetting<number>(WEEKLY_GOAL_KEY, 3);
  const today = todayIso();
  if (!sessions.length) return <EmptyState icon="user" title="Pas encore de séance">Votre progression de cavalier s’affichera ici.</EmptyState>;
  const months = lastMonths(6, today).map((m) => {
    const list = sessions.filter((s) => monthKey(s.date) === m);
    return { month: m, count: list.length };
  });
  const weeks = weeklySeries(sessions, 12, today);
  const reached = weeks.slice(0, -1).filter((w) => w.count >= goal).length;
  const exercises = new Map<string, number>();
  for (const s of sessions) for (const e of s.exercises) exercises.set(e, (exercises.get(e) ?? 0) + 1);
  const topEx = [...exercises.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const rf = averageFeeling(sessions.slice(0, 10), 'riderFeeling');

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <StatTile label="Régularité" value={`${weeklyStreak(sessions, today)} sem.`} hint="consécutives" />
        <StatTile label="Objectif atteint" value={`${reached}/11`} hint={`semaines à ${goal}+ séances`} />
        <StatTile label="Mon ressenti" value={rf ? `${String(rf).replace('.', ',')}/5` : '—'} hint="10 dernières séances" />
        <StatTile label="Disciplines" value={String(new Set(sessions.map((s) => s.discipline)).size)} />
      </div>
      <Section title="Séances par mois">
        <Card>
          <BarChart
            summary={`Séances par mois : ${months.map((m) => `${formatMonth(m.month)} ${m.count}`).join(', ')}`}
            data={months.map((m, i) => ({ label: formatMonthShort(m.month).replace('.', '').slice(0, 4), value: m.count, title: `${formatMonth(m.month)} : ${plural(m.count, 'séance', 'séances')}`, highlight: i === months.length - 1 }))}
          />
        </Card>
      </Section>
      {topEx.length > 0 && (
        <Section title="Exercices les plus travaillés">
          <Card>
            <HBarList items={topEx.map(([label, n]) => ({ label, value: n, display: `${n}×` }))} />
          </Card>
        </Section>
      )}
      {profile?.goals.length ? (
        <Section title="Mes objectifs">
          <div className="chips">
            {profile.goals.map((g) => (
              <Badge key={g} tone="brand">
                {GOAL_LABELS[g]}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
