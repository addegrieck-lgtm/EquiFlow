/** Lectures réactives : les écrans se mettent à jour dès qu'une donnée change (Dexie liveQuery). */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { Horse } from '../domain/models';
import { todayIso } from '../lib/dates';
import { computeDueItems, type DueItem } from '../services/reminders';
import type { AiContext } from '../services/ai/types';
import type { LatLon } from '../services/geo';
import { db } from './db';
import { setSetting } from './repo';

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'fr');

export const useProfile = () => useLiveQuery(() => db.profiles.toCollection().first(), []);
export const useProfileLoaded = () => useLiveQuery(async () => ({ profile: await db.profiles.toCollection().first() }), []);

export const useHorses = () => useLiveQuery(async () => (await db.horses.toArray()).sort(byName), []);
export const useHorse = (id?: string) => useLiveQuery(() => (id ? db.horses.get(id) : undefined), [id]);

export function useSetting<T>(key: string, fallback: T): T {
  const s = useLiveQuery(() => db.settings.get(key), [key]);
  return s === undefined ? fallback : (s.value as T);
}

export const ACTIVE_HORSE_KEY = 'activeHorseId';
export const HOME_KEY = 'geo.home';
export const WEEKLY_GOAL_KEY = 'sessions.weeklyGoal';

/** Cheval sélectionné (à défaut, le premier non vendu). */
export function useActiveHorse(): { horse?: Horse; horses: Horse[]; loading: boolean } {
  const horses = useHorses();
  const activeId = useSetting<string | undefined>(ACTIVE_HORSE_KEY, undefined);
  return useMemo(() => {
    if (!horses) return { horses: [], loading: true };
    const horse = horses.find((h) => h.id === activeId) ?? horses.find((h) => h.status !== 'sold') ?? horses[0];
    return { horse, horses, loading: false };
  }, [horses, activeId]);
}

export const setActiveHorse = (id: string) => setSetting(ACTIVE_HORSE_KEY, id);

export const useCareRecords = (horseId?: string) =>
  useLiveQuery(async () => {
    const list = horseId ? await db.careRecords.where('horseId').equals(horseId).toArray() : await db.careRecords.toArray();
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [horseId]);

export const useExpenses = () => useLiveQuery(async () => (await db.expenses.toArray()).sort((a, b) => b.date.localeCompare(a.date)), []);
export const useSessions = (horseId?: string) =>
  useLiveQuery(async () => {
    const list = horseId ? await db.sessions.where('horseId').equals(horseId).toArray() : await db.sessions.toArray();
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [horseId]);
export const useEvents = () => useLiveQuery(() => db.events.toArray(), []);
export const useProfessionals = () => useLiveQuery(async () => (await db.professionals.toArray()).sort(byName), []);
export const useDocuments = (horseId?: string) =>
  useLiveQuery(async () => {
    const list = horseId ? await db.documents.where('horseId').equals(horseId).toArray() : await db.documents.toArray();
    return list.sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt));
  }, [horseId]);
export const useReminderRules = () => useLiveQuery(() => db.reminderRules.toArray(), []);

/** Échéances de soins calculées pour tous les chevaux. */
export function useDueItems(): DueItem[] | undefined {
  const data = useLiveQuery(async () => ({
    horses: await db.horses.toArray(),
    care: await db.careRecords.toArray(),
    rules: await db.reminderRules.toArray(),
    states: await db.reminderStates.toArray(),
  }), []);
  return useMemo(() => (data ? computeDueItems(data.horses, data.care, data.rules, data.states, todayIso()) : undefined), [data]);
}

/** Toutes les données autorisées pour EQUIFLOW AI. */
export function useAiContext(): AiContext | undefined {
  return useLiveQuery(async () => {
    const [profile, horses, care, rules, reminderStates, expenses, sessions, events, professionals, documents, active, home] = await Promise.all([
      db.profiles.toCollection().first(),
      db.horses.toArray(),
      db.careRecords.toArray(),
      db.reminderRules.toArray(),
      db.reminderStates.toArray(),
      db.expenses.toArray(),
      db.sessions.toArray(),
      db.events.toArray(),
      db.professionals.toArray(),
      db.documents.toArray(),
      db.settings.get(ACTIVE_HORSE_KEY),
      db.settings.get(HOME_KEY),
    ]);
    return {
      today: todayIso(),
      profile,
      horses,
      activeHorseId: active?.value as string | undefined,
      care,
      rules,
      reminderStates,
      expenses,
      sessions,
      events,
      professionals,
      documents,
      home: home?.value as LatLon | undefined,
    };
  }, []);
}
