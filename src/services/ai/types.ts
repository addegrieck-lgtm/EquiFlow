import type {
  CalendarEvent,
  CareRecord,
  EventType,
  Expense,
  Horse,
  HorseDocument,
  Professional,
  Profile,
  ReminderRule,
  ReminderState,
  TrainingSession,
} from '../../domain/models';
import type { LatLon } from '../geo';

/** Données autorisées pour l'assistant : uniquement celles de l'utilisateur, sur l'appareil. */
export interface AiContext {
  today: string;
  profile?: Profile;
  horses: Horse[];
  activeHorseId?: string;
  care: CareRecord[];
  rules: ReminderRule[];
  reminderStates: ReminderState[];
  expenses: Expense[];
  sessions: TrainingSession[];
  events: CalendarEvent[];
  professionals: Professional[];
  documents: HorseDocument[];
  home?: LatLon;
}

/**
 * Nature de chaque information (SPEC §9) :
 * data = enregistré par l'utilisateur · calc = calculé à partir de ses données ·
 * suggestion = proposition de l'assistant · uncertain = manquant ou incertain · warning = avertissement.
 */
export type SourceKind = 'data' | 'calc' | 'suggestion' | 'uncertain' | 'warning';

export interface AnswerBlock {
  kind: SourceKind;
  text: string;
  items?: string[];
}

export interface PlanItem {
  date: string;
  time?: string;
  title: string;
  durationMin: number;
  notes?: string;
  type: EventType;
}

export type AiAction =
  | { type: 'addPlan'; horseId: string; items: PlanItem[] }
  | { type: 'call'; label: string; phone: string }
  | { type: 'link'; label: string; href: string };

export type Intent =
  | 'safety'
  | 'plan'
  | 'sessions'
  | 'cost'
  | 'schedule'
  | 'care'
  | 'pros'
  | 'documents'
  | 'horseInfo'
  | 'help';

export interface AiAnswer {
  intent: Intent;
  horseId?: string;
  blocks: AnswerBlock[];
  actions: AiAction[];
}
