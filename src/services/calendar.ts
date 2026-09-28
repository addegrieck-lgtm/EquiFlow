/** Récurrences d'événements et export iCalendar (.ics) vers le Calendrier de l'iPhone (SPEC §I.7). */
import type { CalendarEvent } from '../domain/models';
import { addDays, addMonths, diffDays, fromIso } from '../lib/dates';

export interface Occurrence {
  event: CalendarEvent;
  date: string;
  done: boolean;
}

const MAX_OCCURRENCES = 1000;

function step(date: string, freq: CalendarEvent['recurrence']['freq'], interval: number, n: number, start: string): string {
  switch (freq) {
    case 'daily':
      return addDays(date, interval);
    case 'weekly':
      return addDays(date, 7 * interval);
    case 'monthly':
      return addMonths(start, interval * n); // depuis le début : le 31 reste le 31 quand il existe
    case 'yearly':
      return addMonths(start, 12 * interval * n);
    default:
      return date;
  }
}

/** Dates d'occurrence d'un événement comprises entre from et to (inclus). */
export function occurrenceDates(e: CalendarEvent, from: string, to: string): string[] {
  const { freq, interval, until } = e.recurrence;
  if (freq === 'none') return e.date >= from && e.date <= to ? [e.date] : [];
  const last = until && until < to ? until : to;
  const out: string[] = [];
  let d = e.date;
  // Saut direct près de `from` pour les récurrences quotidiennes / hebdomadaires anciennes.
  if ((freq === 'daily' || freq === 'weekly') && d < from) {
    const period = freq === 'daily' ? interval : 7 * interval;
    d = addDays(d, Math.floor(diffDays(d, from) / period) * period);
  }
  for (let n = 1; d <= last && out.length < MAX_OCCURRENCES; n++) {
    if (d >= from) out.push(d);
    const next = step(d, freq, interval, n, e.date);
    if (next <= d) break;
    d = next;
  }
  return out;
}

export function expandEvents(events: CalendarEvent[], from: string, to: string): Occurrence[] {
  return events
    .flatMap((event) => occurrenceDates(event, from, to).map((date) => ({ event, date, done: event.doneDates.includes(date) })))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.event.time ?? '').localeCompare(b.event.time ?? ''));
}

// --- Export iCalendar (RFC 5545) --------------------------------------------------------------

export interface IcsItem {
  uid: string;
  title: string;
  date: string;
  time?: string;
  durationMin?: number;
  description?: string;
  location?: string;
  /** Minutes avant le début ; pour un événement sur la journée, compté depuis minuit. */
  alertMin?: number;
  rrule?: string;
}

const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Replie les lignes à 75 caractères (règle RFC 5545). */
function fold(line: string): string {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i ? ' ' : '') + line.slice(i, i + 73));
  return parts.join('\r\n');
}

const compact = (iso: string) => iso.replace(/-/g, '');

function localDateTime(date: string, time: string, addMin = 0): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(fromIso(date).getTime() + (h * 60 + m + addMin) * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00`;
}

export function toRrule(e: CalendarEvent): string | undefined {
  const { freq, interval, until } = e.recurrence;
  if (freq === 'none') return undefined;
  return [`FREQ=${freq.toUpperCase()}`, interval > 1 ? `INTERVAL=${interval}` : '', until ? `UNTIL=${compact(until)}` : '']
    .filter(Boolean)
    .join(';');
}

export function buildIcs(items: IcsItem[], stamp = new Date()): string {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EQUIFLOW//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const it of items) {
    lines.push('BEGIN:VEVENT', `UID:${it.uid}@equiflow`, `DTSTAMP:${dtstamp}`);
    if (it.time) {
      // Heure « flottante » : l'heure locale de l'utilisateur, où qu'il soit.
      lines.push(`DTSTART:${localDateTime(it.date, it.time)}`, `DTEND:${localDateTime(it.date, it.time, it.durationMin ?? 60)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(it.date)}`, `DTEND;VALUE=DATE:${compact(addDays(it.date, 1))}`);
    }
    lines.push(`SUMMARY:${escape(it.title)}`);
    if (it.description) lines.push(`DESCRIPTION:${escape(it.description)}`);
    if (it.location) lines.push(`LOCATION:${escape(it.location)}`);
    if (it.rrule) lines.push(`RRULE:${it.rrule}`);
    if (it.alertMin !== undefined) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escape(it.title)}`, `TRIGGER:-PT${it.alertMin}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
