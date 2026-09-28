/**
 * Dates civiles « AAAA-MM-JJ » manipulées en UTC pour éviter les décalages de fuseau horaire
 * et de changement d'heure : une échéance au 12 mars reste au 12 mars partout.
 */

const DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

export function toIso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Date du jour dans le fuseau de l'utilisateur. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(fromIso(iso).getTime() + days * DAY));
}

/** Ajoute des mois en restant dans le mois cible (31 janvier + 1 mois = 28/29 février). */
export function addMonths(iso: string, months: number): string {
  const d = fromIso(iso);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return toIso(target);
}

/** Nombre de jours de a à b (positif si b est après a). */
export function diffDays(a: string, b: string): number {
  return Math.round((fromIso(b).getTime() - fromIso(a).getTime()) / DAY);
}

/** Lundi de la semaine contenant la date. */
export function startOfWeek(iso: string): string {
  const dow = (fromIso(iso).getUTCDay() + 6) % 7; // lundi = 0
  return addDays(iso, -dow);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: string): string {
  return addDays(addMonths(startOfMonth(iso), 1), -1);
}

/** Clé de mois « AAAA-MM ». */
export const monthKey = (iso: string) => iso.slice(0, 7);

/** Liste des n derniers mois (clés AAAA-MM), du plus ancien au plus récent, mois courant inclus. */
export function lastMonths(n: number, today: string): string[] {
  const start = startOfMonth(today);
  return Array.from({ length: n }, (_, i) => monthKey(addMonths(start, i - n + 1)));
}

export function isBetween(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

// --- Affichage --------------------------------------------------------------------------------

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  fromIso(iso).toLocaleDateString('fr-FR', { timeZone: 'UTC', ...opts });

/** 28/09/2026 */
export const formatDate = (iso: string) => fmt(iso, { day: '2-digit', month: '2-digit', year: 'numeric' });
/** 28 sept. */
export const formatShort = (iso: string) => fmt(iso, { day: 'numeric', month: 'short' });
/** lundi 28 septembre */
export const formatLong = (iso: string) => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });
/** septembre 2026 */
export const formatMonth = (iso: string) => fmt(iso.length === 7 ? `${iso}-01` : iso, { month: 'long', year: 'numeric' });
/** sept. */
export const formatMonthShort = (key: string) => fmt(`${key}-01`, { month: 'short' });

/** « aujourd'hui », « demain », « dans 12 jours », « il y a 3 jours ». */
export function relativeDays(iso: string, today: string): string {
  const d = diffDays(today, iso);
  if (d === 0) return 'aujourd’hui';
  if (d === 1) return 'demain';
  if (d === -1) return 'hier';
  if (d > 0) return `dans ${d} jours`;
  return `il y a ${-d} jours`;
}

/** Âge en années à partir de l'année de naissance. */
export function ageFromYear(birthYear: number | undefined, today: string): number | undefined {
  return birthYear ? Number(today.slice(0, 4)) - birthYear : undefined;
}
