/**
 * Moteur d'échéances : à partir de l'historique des soins, calcule les prochains
 * vaccins, vermifuges, passages du maréchal, du dentiste… (SPEC §E.5, §H.3).
 */
import type { CareRecord, CareType, Horse, ReminderRule, ReminderState } from '../domain/models';
import { addDays, diffDays } from '../lib/dates';

export interface DefaultRule {
  intervalDays: number;
  noticeDays: number;
}

/**
 * Intervalles par défaut, modifiables cheval par cheval. Ce sont des repères courants,
 * pas des prescriptions : le protocole se décide avec le vétérinaire.
 */
export const DEFAULT_RULES: Partial<Record<CareType, DefaultRule>> = {
  vaccination: { intervalDays: 365, noticeDays: 30 },
  deworming: { intervalDays: 120, noticeDays: 14 },
  farrier: { intervalDays: 49, noticeDays: 7 },
  dental: { intervalDays: 365, noticeDays: 30 },
  osteopath: { intervalDays: 365, noticeDays: 30 },
};

export type DueStatus = 'ok' | 'soon' | 'overdue';

export interface DueItem {
  /** Clé stable d'un cycle : l'action « fait / reporter » ne vaut que pour cette échéance. */
  key: string;
  horseId: string;
  careType: CareType;
  lastRecordId: string;
  lastDate: string;
  dueDate: string;
  daysLeft: number;
  status: DueStatus;
  /** 'manual' = date saisie par l'utilisateur ; 'rule' = calculée à partir de l'intervalle. */
  source: 'manual' | 'rule';
}

export function ruleFor(horseId: string, type: CareType, rules: ReminderRule[]): DefaultRule | undefined {
  const custom = rules.find((r) => r.horseId === horseId && r.careType === type);
  if (custom) return custom.enabled ? custom : undefined;
  return DEFAULT_RULES[type];
}

export function statusFor(dueDate: string, today: string, noticeDays: number): DueStatus {
  const left = diffDays(today, dueDate);
  if (left < 0) return 'overdue';
  if (left <= noticeDays) return 'soon';
  return 'ok';
}

export function computeDueItems(
  horses: Horse[],
  records: CareRecord[],
  rules: ReminderRule[],
  states: ReminderState[],
  today: string,
): DueItem[] {
  const activeHorses = new Set(horses.filter((h) => h.status !== 'sold').map((h) => h.id));
  const stateByKey = new Map(states.map((s) => [s.key, s]));

  // Dernier soin par cheval et par type.
  const latest = new Map<string, CareRecord>();
  for (const r of records) {
    if (!activeHorses.has(r.horseId)) continue;
    const k = `${r.horseId}:${r.type}`;
    const cur = latest.get(k);
    if (!cur || r.date > cur.date || (r.date === cur.date && r.createdAt > cur.createdAt)) latest.set(k, r);
  }

  const items: DueItem[] = [];
  for (const r of latest.values()) {
    const rule = ruleFor(r.horseId, r.type, rules);
    const dueDate = r.nextDueAt ?? (rule ? addDays(r.date, rule.intervalDays) : undefined);
    if (!dueDate) continue;
    const key = `care:${r.horseId}:${r.type}:${dueDate}`;
    const state = stateByKey.get(key);
    if (state?.status === 'done' || state?.status === 'dismissed') continue;
    if (state?.status === 'snoozed' && state.snoozedUntil && state.snoozedUntil > today) continue;
    const noticeDays = rule?.noticeDays ?? 14;
    items.push({
      key,
      horseId: r.horseId,
      careType: r.type,
      lastRecordId: r.id,
      lastDate: r.date,
      dueDate,
      daysLeft: diffDays(today, dueDate),
      status: statusFor(dueDate, today, noticeDays),
      source: r.nextDueAt ? 'manual' : 'rule',
    });
  }
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Échéances à signaler maintenant (en retard ou dans la fenêtre de préavis). */
export const actionable = (items: DueItem[]) => items.filter((i) => i.status !== 'ok');
