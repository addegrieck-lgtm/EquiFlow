import Dexie, { type Table } from 'dexie';
import {
  aiMessageSchema,
  calendarEventSchema,
  careRecordSchema,
  expenseSchema,
  horseDocumentSchema,
  horseSchema,
  professionalSchema,
  profileSchema,
  reminderRuleSchema,
  reminderStateSchema,
  storedFileSchema,
  trainingSessionSchema,
  type AiMessage,
  type CalendarEvent,
  type CareRecord,
  type Expense,
  type Horse,
  type HorseDocument,
  type Professional,
  type Profile,
  type ReminderRule,
  type ReminderState,
  type Setting,
  type StoredFile,
  type TrainingSession,
} from '../domain/models';

export class EquiflowDb extends Dexie {
  profiles!: Table<Profile, string>;
  horses!: Table<Horse, string>;
  files!: Table<StoredFile, string>;
  professionals!: Table<Professional, string>;
  careRecords!: Table<CareRecord, string>;
  reminderRules!: Table<ReminderRule, string>;
  documents!: Table<HorseDocument, string>;
  expenses!: Table<Expense, string>;
  events!: Table<CalendarEvent, string>;
  sessions!: Table<TrainingSession, string>;
  reminderStates!: Table<ReminderState, string>;
  aiMessages!: Table<AiMessage, string>;
  settings!: Table<Setting, string>;

  constructor(name = 'equiflow') {
    super(name);
    // Toute évolution du schéma = nouvelle version + migration (jamais modifier une version publiée).
    this.version(1).stores({
      profiles: 'id',
      horses: 'id, name',
      files: 'id',
      professionals: 'id, trade, name',
      careRecords: 'id, horseId, type, date, [horseId+type]',
      reminderRules: 'id, horseId, [horseId+careType]',
      documents: 'id, horseId, category, date',
      expenses: 'id, horseId, date, category',
      events: 'id, date, horseId, type',
      sessions: 'id, horseId, date',
      reminderStates: 'id, &key',
      aiMessages: 'id, createdAt',
      settings: 'key',
    });
  }
}

/** Tables métier sauvegardées (settings et fichiers sont traités à part). */
export const RECORD_TABLES = {
  profiles: profileSchema,
  horses: horseSchema,
  professionals: professionalSchema,
  careRecords: careRecordSchema,
  reminderRules: reminderRuleSchema,
  documents: horseDocumentSchema,
  expenses: expenseSchema,
  events: calendarEventSchema,
  sessions: trainingSessionSchema,
  reminderStates: reminderStateSchema,
  aiMessages: aiMessageSchema,
} as const;

export type RecordTableName = keyof typeof RECORD_TABLES;
export const FILE_SCHEMA = storedFileSchema;

export let db = new EquiflowDb();

/** Tests uniquement : base isolée. */
export function resetDbForTests(name: string): EquiflowDb {
  db = new EquiflowDb(name);
  return db;
}
