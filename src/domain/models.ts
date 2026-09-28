/**
 * Modèle de données EQUIFLOW (docs/SPEC.md §J).
 * Chaque schéma Zod sert à la fois de type TypeScript, de validation des formulaires
 * et de validation des sauvegardes importées. Mêmes champs qu'en Postgres (V1.5).
 */
import { z } from 'zod';

// --- Champs communs --------------------------------------------------------------------------

/** Date civile ISO « AAAA-MM-JJ » (pas d'heure : évite les décalages de fuseau). */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide');
/** Horodatage ISO complet. */
export const isoDateTime = z.string().datetime({ offset: true });

export const baseFields = {
  id: z.string().min(1),
  ownerId: z.string().min(1),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.optional(),
  version: z.number().int().nonnegative(),
};

export type BaseKeys = keyof typeof baseFields;

// --- Référentiels -----------------------------------------------------------------------------

export const ROLES = ['rider', 'owner', 'coach', 'pro', 'stable'] as const;
export const GOALS = ['progress', 'competition', 'dressage', 'jumping', 'leisure', 'trail', 'fitness', 'other'] as const;
export const SEXES = ['mare', 'gelding', 'stallion'] as const;
export const DISCIPLINES = ['jumping', 'dressage', 'eventing', 'leisure', 'trail', 'endurance', 'western', 'horseball', 'driving', 'other'] as const;
export const LEVELS = ['beginner', 'club', 'amateur', 'pro'] as const;
export const HORSE_STATUSES = ['active', 'resting', 'injured', 'retired', 'sold'] as const;

export const CARE_TYPES = ['vaccination', 'deworming', 'treatment', 'vet_visit', 'farrier', 'dental', 'osteopath', 'massage', 'other'] as const;
export const TRADES = ['vet', 'farrier', 'dentist', 'osteopath', 'massage', 'transport', 'boarding', 'groom', 'photographer', 'coach', 'other'] as const;
export const DOCUMENT_CATEGORIES = ['passport', 'invoice', 'prescription', 'certificate', 'insurance', 'competition', 'other'] as const;
export const EXPENSE_CATEGORIES = ['boarding', 'vet', 'farrier', 'feed', 'equipment', 'competition', 'transport', 'coaching', 'insurance', 'care', 'other'] as const;
export const EVENT_TYPES = ['training', 'competition', 'vet', 'farrier', 'dentist', 'osteopath', 'vaccination', 'deworming', 'transport', 'coach', 'other'] as const;
export const SESSION_TYPES = ['flatwork', 'jumping', 'lunging', 'trail', 'groundwork', 'lesson', 'competition', 'rest', 'other'] as const;
export const RECURRENCE_FREQS = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const;

export type Role = (typeof ROLES)[number];
export type Goal = (typeof GOALS)[number];
export type Sex = (typeof SEXES)[number];
export type Discipline = (typeof DISCIPLINES)[number];
export type Level = (typeof LEVELS)[number];
export type CareType = (typeof CARE_TYPES)[number];
export type Trade = (typeof TRADES)[number];
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type EventType = (typeof EVENT_TYPES)[number];
export type SessionType = (typeof SESSION_TYPES)[number];
export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number];

// --- Tables -----------------------------------------------------------------------------------

export const profileSchema = z.object({
  ...baseFields,
  firstName: z.string().trim().min(1, 'Prénom requis').max(40),
  role: z.enum(ROLES),
  goals: z.array(z.enum(GOALS)),
  level: z.enum(LEVELS).optional(),
  onboardedAt: isoDateTime.optional(),
});
export type Profile = z.infer<typeof profileSchema>;

export const horseSchema = z.object({
  ...baseFields,
  name: z.string().trim().min(1, 'Nom requis').max(40, '40 caractères maximum'),
  photoFileId: z.string().optional(),
  sex: z.enum(SEXES).optional(),
  birthYear: z.number().int().min(1970).max(2100).optional(),
  breed: z.string().trim().max(60).optional(),
  color: z.string().trim().max(40).optional(),
  heightCm: z.number().int().min(50).max(220).optional(),
  discipline: z.enum(DISCIPLINES).optional(),
  level: z.enum(LEVELS).optional(),
  location: z.string().trim().max(80).optional(),
  ueln: z.string().trim().max(20).optional(),
  microchip: z.string().trim().max(20).optional(),
  status: z.enum(HORSE_STATUSES),
  notes: z.string().max(2000).optional(),
});
export type Horse = z.infer<typeof horseSchema>;

/** Fichier binaire (photo, PDF, vidéo) stocké dans IndexedDB. */
export const storedFileSchema = z.object({
  ...baseFields,
  name: z.string(),
  mime: z.string(),
  size: z.number().int().nonnegative(),
  blob: z.instanceof(Blob),
  thumbnail: z.instanceof(Blob).optional(),
});
export type StoredFile = z.infer<typeof storedFileSchema>;

export const professionalSchema = z.object({
  ...baseFields,
  name: z.string().trim().min(1, 'Nom requis').max(80),
  trade: z.enum(TRADES),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email('E-mail invalide').max(120).optional(),
  address: z.string().trim().max(200).optional(),
  notes: z.string().max(2000).optional(),
});
export type Professional = z.infer<typeof professionalSchema>;

/** Détails propres à chaque type de soin (tous optionnels : la saisie doit rester rapide). */
export const careDetailsSchema = z.object({
  product: z.string().trim().max(80).optional(), // vaccin, vermifuge, médicament
  dosage: z.string().trim().max(80).optional(),
  frequency: z.string().trim().max(80).optional(),
  endDate: isoDate.optional(), // fin de traitement
  shoeing: z.string().trim().max(80).optional(), // type de ferrure
  reason: z.string().trim().max(200).optional(),
});
export type CareDetails = z.infer<typeof careDetailsSchema>;

export const careRecordSchema = z.object({
  ...baseFields,
  horseId: z.string(),
  type: z.enum(CARE_TYPES),
  date: isoDate,
  title: z.string().trim().max(120).optional(),
  professionalId: z.string().optional(),
  expenseId: z.string().optional(),
  documentIds: z.array(z.string()),
  details: careDetailsSchema,
  /** Échéance saisie à la main ; sinon calculée à partir des règles de rappel. */
  nextDueAt: isoDate.optional(),
  notes: z.string().max(2000).optional(),
});
export type CareRecord = z.infer<typeof careRecordSchema>;

/** Intervalle de rappel par cheval et par type de soin. */
export const reminderRuleSchema = z.object({
  ...baseFields,
  horseId: z.string(),
  careType: z.enum(CARE_TYPES),
  intervalDays: z.number().int().min(1).max(3650),
  noticeDays: z.number().int().min(0).max(120),
  enabled: z.boolean(),
});
export type ReminderRule = z.infer<typeof reminderRuleSchema>;

export const horseDocumentSchema = z.object({
  ...baseFields,
  horseId: z.string().optional(),
  fileId: z.string(),
  category: z.enum(DOCUMENT_CATEGORIES),
  title: z.string().trim().min(1, 'Titre requis').max(120),
  date: isoDate.optional(),
  expiresAt: isoDate.optional(),
  /** Texte reconnu par le SCAN (utile à la recherche). */
  ocrText: z.string().max(20000).optional(),
});
export type HorseDocument = z.infer<typeof horseDocumentSchema>;

export const expenseSchema = z.object({
  ...baseFields,
  horseId: z.string().optional(),
  date: isoDate,
  amountCents: z.number().int().positive('Montant requis'),
  currency: z.string().length(3),
  category: z.enum(EXPENSE_CATEGORIES),
  label: z.string().trim().max(120).optional(),
  professionalId: z.string().optional(),
  documentId: z.string().optional(),
  careRecordId: z.string().optional(),
  /** Dépense qui se répète chaque mois (pension, assurance…) à partir de `date`. */
  monthly: z.boolean(),
  /** Dernier mois inclus pour une dépense mensuelle (absent = toujours en cours). */
  endDate: isoDate.optional(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const recurrenceSchema = z.object({
  freq: z.enum(RECURRENCE_FREQS),
  interval: z.number().int().min(1).max(52),
  until: isoDate.optional(),
});
export type Recurrence = z.infer<typeof recurrenceSchema>;

export const calendarEventSchema = z.object({
  ...baseFields,
  horseId: z.string().optional(),
  type: z.enum(EVENT_TYPES),
  title: z.string().trim().min(1, 'Titre requis').max(120),
  date: isoDate,
  /** « HH:MM », absent pour un événement sur la journée. */
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMin: z.number().int().min(5).max(24 * 60).optional(),
  recurrence: recurrenceSchema,
  professionalId: z.string().optional(),
  location: z.string().trim().max(120).optional(),
  notes: z.string().max(2000).optional(),
  /** Rappel en minutes avant l'événement (export Calendrier). */
  alertMin: z.number().int().min(0).max(60 * 24 * 14).optional(),
  /** Occurrences marquées faites (dates ISO). */
  doneDates: z.array(isoDate),
});
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const trainingSessionSchema = z.object({
  ...baseFields,
  horseId: z.string(),
  date: isoDate,
  durationMin: z.number().int().min(1, 'Durée requise').max(600),
  discipline: z.enum(DISCIPLINES),
  sessionType: z.enum(SESSION_TYPES),
  gaits: z.object({ walk: z.number().int().min(0).max(600), trot: z.number().int().min(0).max(600), canter: z.number().int().min(0).max(600) }),
  distanceKm: z.number().min(0).max(200).optional(),
  exercises: z.array(z.string().trim().min(1).max(80)),
  difficulty: z.number().int().min(1).max(5).optional(),
  horseFeeling: z.number().int().min(1).max(5).optional(),
  riderFeeling: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(4000).optional(),
  fileIds: z.array(z.string()),
});
export type TrainingSession = z.infer<typeof trainingSessionSchema>;

/** Action de l'utilisateur sur un rappel calculé (fait, reporté, ignoré). */
export const reminderStateSchema = z.object({
  ...baseFields,
  key: z.string(),
  status: z.enum(['done', 'snoozed', 'dismissed']),
  snoozedUntil: isoDate.optional(),
});
export type ReminderState = z.infer<typeof reminderStateSchema>;

export const aiMessageSchema = z.object({
  ...baseFields,
  role: z.enum(['user', 'assistant']),
  text: z.string().max(20000),
  /** Réponse structurée de l'assistant (voir services/ai). */
  payload: z.unknown().optional(),
});
export type AiMessage = z.infer<typeof aiMessageSchema>;

export const settingSchema = z.object({ key: z.string(), value: z.unknown() });
export type Setting = z.infer<typeof settingSchema>;
