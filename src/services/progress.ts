/** Statistiques de progression du cheval et du cavalier (SPEC §14). */
import type { Discipline, TrainingSession } from '../domain/models';
import { addDays, startOfWeek } from '../lib/dates';

export interface WeekSummary {
  count: number;
  minutes: number;
  previousCount: number;
  previousMinutes: number;
}

export function weekSummary(sessions: TrainingSession[], today: string): WeekSummary {
  const start = startOfWeek(today);
  const prevStart = addDays(start, -7);
  const cur = sessions.filter((s) => s.date >= start && s.date <= addDays(start, 6));
  const prev = sessions.filter((s) => s.date >= prevStart && s.date < start);
  return {
    count: cur.length,
    minutes: cur.reduce((m, s) => m + s.durationMin, 0),
    previousCount: prev.length,
    previousMinutes: prev.reduce((m, s) => m + s.durationMin, 0),
  };
}

/** Séances et minutes par semaine, sur n semaines (la plus ancienne d'abord). */
export function weeklySeries(sessions: TrainingSession[], weeks: number, today: string) {
  const current = startOfWeek(today);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(current, (i - weeks + 1) * 7);
    const end = addDays(start, 6);
    const list = sessions.filter((s) => s.date >= start && s.date <= end);
    return { week: start, count: list.length, minutes: list.reduce((m, s) => m + s.durationMin, 0) };
  });
}

export function disciplineBreakdown(sessions: TrainingSession[]): { discipline: Discipline; count: number; minutes: number }[] {
  const map = new Map<Discipline, { count: number; minutes: number }>();
  for (const s of sessions) {
    const cur = map.get(s.discipline) ?? { count: 0, minutes: 0 };
    map.set(s.discipline, { count: cur.count + 1, minutes: cur.minutes + s.durationMin });
  }
  return [...map.entries()].map(([discipline, v]) => ({ discipline, ...v })).sort((a, b) => b.minutes - a.minutes);
}

/**
 * Régularité : nombre de semaines consécutives avec au moins une séance, en remontant
 * depuis la semaine en cours (si elle est encore vide, on part de la semaine précédente).
 */
export function weeklyStreak(sessions: TrainingSession[], today: string): number {
  const weeks = new Set(sessions.map((s) => startOfWeek(s.date)));
  let cursor = startOfWeek(today);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function gaitTotals(sessions: TrainingSession[]) {
  return sessions.reduce(
    (t, s) => ({ walk: t.walk + s.gaits.walk, trot: t.trot + s.gaits.trot, canter: t.canter + s.gaits.canter }),
    { walk: 0, trot: 0, canter: 0 },
  );
}

export function averageFeeling(sessions: TrainingSession[], key: 'horseFeeling' | 'riderFeeling'): number | undefined {
  const vals = sessions.map((s) => s[key]).filter((v): v is number => v !== undefined);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : undefined;
}

/** Séances des n derniers jours (aujourd'hui inclus). */
export function inLastDays(sessions: TrainingSession[], days: number, today: string): TrainingSession[] {
  const from = addDays(today, -(days - 1));
  return sessions.filter((s) => s.date >= from && s.date <= today);
}
