/** Compréhension des périodes en français : « depuis janvier », « la semaine prochaine », « en 2025 »… */
import { addDays, addMonths, endOfMonth, startOfMonth, startOfWeek } from '../../lib/dates';

export interface Period {
  from: string;
  to: string;
  label: string;
}

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTH_RE = MONTHS.join('|');
const pad = (n: number) => String(n).padStart(2, '0');

/** `q` doit être normalisé (minuscules, sans accents). */
export function parsePeriod(q: string, today: string): Period | undefined {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  let m: RegExpMatchArray | null;

  if (/aujourd.?hui/.test(q)) return { from: today, to: today, label: 'aujourd’hui' };
  if (/\bdemain\b/.test(q)) return { from: addDays(today, 1), to: addDays(today, 1), label: 'demain' };
  if (/\bhier\b/.test(q)) return { from: addDays(today, -1), to: addDays(today, -1), label: 'hier' };

  const week = startOfWeek(today);
  if (/semaine prochaine/.test(q)) return { from: addDays(week, 7), to: addDays(week, 13), label: 'la semaine prochaine' };
  if (/semaine derniere|semaine passee/.test(q)) return { from: addDays(week, -7), to: addDays(week, -1), label: 'la semaine dernière' };
  if (/cette semaine|de la semaine|\bla semaine\b/.test(q)) return { from: week, to: addDays(week, 6), label: 'cette semaine' };

  if ((m = q.match(/(\d{1,3}) derniers? jours/))) {
    const n = Number(m[1]);
    return { from: addDays(today, -(n - 1)), to: today, label: `sur les ${n} derniers jours` };
  }
  if ((m = q.match(/(\d{1,2}) derniers? mois/))) {
    const n = Number(m[1]);
    return { from: addDays(addMonths(today, -n), 1), to: today, label: `sur les ${n} derniers mois` };
  }

  if (/mois prochain/.test(q)) {
    const s = addMonths(startOfMonth(today), 1);
    return { from: s, to: endOfMonth(s), label: 'le mois prochain' };
  }
  if (/mois dernier|mois precedent/.test(q)) {
    const s = addMonths(startOfMonth(today), -1);
    return { from: s, to: endOfMonth(s), label: 'le mois dernier' };
  }
  if (/ce mois|mois en cours|mois-ci/.test(q)) return { from: startOfMonth(today), to: today, label: 'ce mois-ci' };

  // « depuis (le 15) mars » : du début de ce mois (cette année, ou l'an dernier s'il est à venir) à aujourd'hui.
  if ((m = q.match(new RegExp(`depuis (?:le )?(?:(\\d{1,2})(?:er)? )?(${MONTH_RE})(?: (\\d{4}))?`)))) {
    const mo = MONTHS.indexOf(m[2]) + 1;
    const y = m[3] ? Number(m[3]) : mo > month ? year - 1 : year;
    const day = m[1] ? Number(m[1]) : 1;
    return { from: `${y}-${pad(mo)}-${pad(day)}`, to: today, label: `depuis ${m[1] ? `le ${day} ` : ''}${MONTHS_FR[mo - 1]}${m[3] ? ` ${y}` : ''}` };
  }
  if ((m = q.match(new RegExp(`\\b(?:en|au mois de|pour) (${MONTH_RE})(?: (\\d{4}))?`)))) {
    const mo = MONTHS.indexOf(m[1]) + 1;
    const y = m[2] ? Number(m[2]) : mo > month ? year - 1 : year;
    const s = `${y}-${pad(mo)}-01`;
    return { from: s, to: endOfMonth(s), label: `en ${MONTHS_FR[mo - 1]} ${y}` };
  }

  if (/annee derniere|an dernier|l.annee passee/.test(q)) return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31`, label: `en ${year - 1}` };
  if (/cette annee|debut de l.annee|depuis le 1er janvier|annee en cours/.test(q)) return { from: `${year}-01-01`, to: today, label: 'depuis le début de l’année' };
  if ((m = q.match(/depuis (\d{4})/))) return { from: `${m[1]}-01-01`, to: today, label: `depuis ${m[1]}` };
  if ((m = q.match(/\ben (\d{4})\b/))) return { from: `${m[1]}-01-01`, to: `${m[1]}-12-31`, label: `en ${m[1]}` };

  return undefined;
}

/** Nombre de mois (même partiels) couverts par la période, bornée à aujourd'hui. */
export function monthsCovered(p: Period, today: string, firstDataDate?: string): number {
  const from = firstDataDate && firstDataDate > p.from ? firstDataDate : p.from;
  const to = p.to < today ? p.to : today;
  if (to < from) return 0;
  return (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1;
}
