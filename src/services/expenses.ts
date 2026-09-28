/** Agrégations des dépenses : totaux, catégories, évolution, « coût réel du cheval » (SPEC §16). */
import type { Expense, ExpenseCategory } from '../domain/models';
import { addMonths, lastMonths, monthKey } from '../lib/dates';

export interface ExpenseFilter {
  from?: string;
  to?: string;
  horseId?: string;
  category?: ExpenseCategory;
}

/** Une dépense réelle ou une échéance d'une dépense mensuelle. */
export interface ExpenseOccurrence {
  expense: Expense;
  date: string;
  amountCents: number;
}

/**
 * Déplie les dépenses mensuelles (pension, assurance…) en une occurrence par mois,
 * de leur date de début jusqu'à `endDate` ou jusqu'au mois de `until`.
 */
export function expandExpenses(expenses: Expense[], until: string): ExpenseOccurrence[] {
  const out: ExpenseOccurrence[] = [];
  for (const e of expenses) {
    if (!e.monthly) {
      out.push({ expense: e, date: e.date, amountCents: e.amountCents });
      continue;
    }
    const stop = e.endDate && e.endDate < until ? e.endDate : until;
    for (let i = 0, d = e.date; monthKey(d) <= monthKey(stop) && i < 600; i++, d = addMonths(e.date, i)) {
      if (d > until) break;
      out.push({ expense: e, date: d, amountCents: e.amountCents });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export function filterOccurrences(occ: ExpenseOccurrence[], f: ExpenseFilter): ExpenseOccurrence[] {
  return occ.filter(
    (o) =>
      (!f.from || o.date >= f.from) &&
      (!f.to || o.date <= f.to) &&
      (!f.horseId || o.expense.horseId === f.horseId) &&
      (!f.category || o.expense.category === f.category),
  );
}

export const sumCents = (occ: ExpenseOccurrence[]) => occ.reduce((s, o) => s + o.amountCents, 0);

export function byCategory(occ: ExpenseOccurrence[]): { category: ExpenseCategory; cents: number }[] {
  const map = new Map<ExpenseCategory, number>();
  for (const o of occ) map.set(o.expense.category, (map.get(o.expense.category) ?? 0) + o.amountCents);
  return [...map.entries()].map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents);
}

/** Total par mois sur les n derniers mois (mois courant inclus). */
export function monthlySeries(occ: ExpenseOccurrence[], months: number, today: string): { month: string; cents: number }[] {
  const keys = lastMonths(months, today);
  const map = new Map(keys.map((k) => [k, 0]));
  for (const o of occ) {
    const k = monthKey(o.date);
    if (map.has(k)) map.set(k, map.get(k)! + o.amountCents);
  }
  return keys.map((month) => ({ month, cents: map.get(month)! }));
}

export interface RealCost {
  /** Nombre de mois réellement pris en compte (moins que demandé si l'historique est court). */
  months: number;
  totalCents: number;
  byCategory: { category: ExpenseCategory; cents: number }[];
}

/**
 * Coût mensuel moyen sur les derniers mois complets (le mois en cours, partiel, est exclu
 * sauf s'il n'y a pas encore d'historique). Les mois antérieurs à la première dépense
 * ne sont pas comptés : sinon un nouvel utilisateur verrait un coût artificiellement bas.
 */
export function realMonthlyCost(occ: ExpenseOccurrence[], today: string, window = 6): RealCost {
  if (!occ.length) return { months: 0, totalCents: 0, byCategory: [] };
  const first = monthKey(occ.reduce((m, o) => (o.date < m ? o.date : m), occ[0].date));
  const current = monthKey(today);
  let keys = lastMonths(window + 1, today).filter((k) => k !== current && k >= first);
  if (!keys.length) keys = [current];
  const set = new Set(keys);
  const inWindow = occ.filter((o) => set.has(monthKey(o.date)));
  const n = keys.length;
  return {
    months: n,
    totalCents: Math.round(sumCents(inWindow) / n),
    byCategory: byCategory(inWindow).map((c) => ({ ...c, cents: Math.round(c.cents / n) })),
  };
}
