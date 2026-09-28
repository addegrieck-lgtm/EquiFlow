import type { CalendarEvent, CareRecord, Expense, Horse, Professional, TrainingSession } from '../src/domain/models';

let seq = 0;
const base = () => {
  const t = '2026-01-01T10:00:00.000Z';
  return { id: `id-${++seq}`, ownerId: 'local', createdAt: t, updatedAt: t, version: 1 };
};

export const horse = (p: Partial<Horse> = {}): Horse => ({ ...base(), name: 'Spirit', status: 'active', ...p });

export const care = (p: Partial<CareRecord> & Pick<CareRecord, 'horseId' | 'type' | 'date'>): CareRecord => ({
  ...base(),
  documentIds: [],
  details: {},
  ...p,
});

export const expense = (p: Partial<Expense> & Pick<Expense, 'date' | 'amountCents' | 'category'>): Expense => ({
  ...base(),
  currency: 'EUR',
  monthly: false,
  ...p,
});

export const session = (p: Partial<TrainingSession> & Pick<TrainingSession, 'horseId' | 'date'>): TrainingSession => ({
  ...base(),
  durationMin: 45,
  discipline: 'jumping',
  sessionType: 'flatwork',
  gaits: { walk: 10, trot: 20, canter: 15 },
  exercises: [],
  fileIds: [],
  ...p,
});

export const event = (p: Partial<CalendarEvent> & Pick<CalendarEvent, 'date'>): CalendarEvent => ({
  ...base(),
  type: 'training',
  title: 'Séance',
  recurrence: { freq: 'none', interval: 1 },
  doneDates: [],
  ...p,
});

export const pro = (p: Partial<Professional> & Pick<Professional, 'name' | 'trade'>): Professional => ({ ...base(), ...p });
