/**
 * Séance en direct : chronomètre avec temps passé à chaque allure.
 * L'état ne contient que des horodatages : il survit au verrouillage de l'écran, à la mise
 * en arrière-plan et même à la fermeture de l'app (sauvegardé dans le stockage local).
 */

export type LiveGait = 'walk' | 'trot' | 'canter' | 'halt';

export interface LiveState {
  horseId?: string;
  startedAt: number;
  /** Allure en cours ; null = chronomètre en pause. */
  current: LiveGait | null;
  /** Début du segment en cours (ms). */
  since: number;
  /** Temps cumulé des segments terminés (ms). */
  totals: Record<LiveGait, number>;
}

const ZERO: Record<LiveGait, number> = { walk: 0, trot: 0, canter: 0, halt: 0 };

export function startLive(now: number, horseId?: string): LiveState {
  return { horseId, startedAt: now, current: 'walk', since: now, totals: { ...ZERO } };
}

function close(s: LiveState, now: number): Record<LiveGait, number> {
  const totals = { ...s.totals };
  if (s.current) totals[s.current] += Math.max(0, now - s.since);
  return totals;
}

export function switchGait(s: LiveState, gait: LiveGait, now: number): LiveState {
  return { ...s, totals: close(s, now), current: gait, since: now };
}

export function pauseLive(s: LiveState, now: number): LiveState {
  return { ...s, totals: close(s, now), current: null, since: now };
}

/** Temps par allure à l'instant `now` (segment en cours inclus). */
export function liveTotals(s: LiveState, now: number): Record<LiveGait, number> {
  return close(s, now);
}

export function liveElapsed(s: LiveState, now: number): number {
  const t = close(s, now);
  return t.walk + t.trot + t.canter + t.halt;
}

/** Résultat à enregistrer : minutes arrondies, au moins 1 minute de séance. */
export function finishLive(s: LiveState, now: number): { durationMin: number; gaits: { walk: number; trot: number; canter: number } } {
  const t = close(s, now);
  const min = (ms: number) => Math.round(ms / 60_000);
  return {
    durationMin: Math.max(1, min(t.walk + t.trot + t.canter + t.halt)),
    gaits: { walk: min(t.walk + t.halt), trot: min(t.trot), canter: min(t.canter) },
  };
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// --- Persistance ---------------------------------------------------------------------------

const KEY = 'equiflow.liveSession';

export function loadLive(): LiveState | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LiveState) : undefined;
  } catch {
    return undefined;
  }
}

export function saveLive(s: LiveState | undefined): void {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible : le chronomètre fonctionne quand même tant que l'écran reste ouvert */
  }
}
