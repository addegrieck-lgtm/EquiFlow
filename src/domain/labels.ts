/** Libellés français des référentiels (l'app est prête pour d'autres langues : un fichier par langue). */
import type { IconName } from '../design/components/Icon';
import type {
  CareType,
  Discipline,
  DocumentCategory,
  EventType,
  ExpenseCategory,
  Goal,
  Level,
  RecurrenceFreq,
  Role,
  SessionType,
  Sex,
  Trade,
} from './models';

export const ROLE_LABELS: Record<Role, string> = {
  rider: 'Je suis cavalier',
  owner: 'Je suis propriétaire',
  coach: 'Je suis coach',
  pro: 'Je suis professionnel',
  stable: 'Je gère une écurie',
};

export const GOAL_LABELS: Record<Goal, string> = {
  progress: 'Progresser',
  competition: 'Concours',
  dressage: 'Dressage',
  jumping: 'Saut',
  leisure: 'Loisir',
  trail: 'Extérieur',
  fitness: 'Remise en forme',
  other: 'Autre',
};

export const SEX_LABELS: Record<Sex, string> = { mare: 'Jument', gelding: 'Hongre', stallion: 'Étalon' };

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  jumping: 'Saut d’obstacles',
  dressage: 'Dressage',
  eventing: 'Concours complet',
  leisure: 'Loisir',
  trail: 'Extérieur / randonnée',
  endurance: 'Endurance',
  western: 'Western',
  horseball: 'Horse-ball',
  driving: 'Attelage',
  other: 'Autre',
};

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Débutant',
  club: 'Club',
  amateur: 'Amateur',
  pro: 'Pro',
};

export const HORSE_STATUS_LABELS = {
  active: 'En activité',
  resting: 'Au repos',
  injured: 'Convalescent',
  retired: 'À la retraite',
  sold: 'Vendu',
} as const;

export const CARE_LABELS: Record<CareType, string> = {
  vaccination: 'Vaccination',
  deworming: 'Vermifuge',
  treatment: 'Traitement',
  vet_visit: 'Visite vétérinaire',
  farrier: 'Maréchal-ferrant',
  dental: 'Dentiste',
  osteopath: 'Ostéopathe',
  massage: 'Massage',
  other: 'Autre soin',
};

export const CARE_ICONS: Record<CareType, IconName> = {
  vaccination: 'syringe',
  deworming: 'pill',
  treatment: 'pill',
  vet_visit: 'health',
  farrier: 'horseshoe',
  dental: 'tooth',
  osteopath: 'hand',
  massage: 'hand',
  other: 'health',
};

export const TRADE_LABELS: Record<Trade, string> = {
  vet: 'Vétérinaire',
  farrier: 'Maréchal-ferrant',
  dentist: 'Dentiste équin',
  osteopath: 'Ostéopathe',
  massage: 'Masseur',
  transport: 'Transporteur',
  boarding: 'Pension',
  groom: 'Groom',
  photographer: 'Photographe',
  coach: 'Coach',
  other: 'Autre',
};

/** Métier habituel pour chaque type de soin (pré-sélection du professionnel). */
export const CARE_TRADE: Partial<Record<CareType, Trade>> = {
  vaccination: 'vet',
  deworming: 'vet',
  treatment: 'vet',
  vet_visit: 'vet',
  farrier: 'farrier',
  dental: 'dentist',
  osteopath: 'osteopath',
  massage: 'massage',
};

export const DOCUMENT_LABELS: Record<DocumentCategory, string> = {
  passport: 'Passeport',
  invoice: 'Facture',
  prescription: 'Ordonnance',
  certificate: 'Certificat',
  insurance: 'Assurance',
  competition: 'Concours',
  other: 'Autre',
};

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  boarding: 'Pension',
  vet: 'Vétérinaire',
  farrier: 'Maréchal',
  feed: 'Alimentation',
  equipment: 'Matériel',
  competition: 'Concours',
  transport: 'Transport',
  coaching: 'Coaching',
  insurance: 'Assurance',
  care: 'Soins',
  other: 'Autre',
};

/** Catégorie de dépense créée automatiquement pour un soin. */
export const CARE_EXPENSE: Record<CareType, ExpenseCategory> = {
  vaccination: 'vet',
  deworming: 'vet',
  treatment: 'vet',
  vet_visit: 'vet',
  farrier: 'farrier',
  dental: 'care',
  osteopath: 'care',
  massage: 'care',
  other: 'care',
};

export const EVENT_LABELS: Record<EventType, string> = {
  training: 'Entraînement',
  competition: 'Concours',
  vet: 'Vétérinaire',
  farrier: 'Maréchal',
  dentist: 'Dentiste',
  osteopath: 'Ostéopathe',
  vaccination: 'Vaccination',
  deworming: 'Vermifuge',
  transport: 'Transport',
  coach: 'Rendez-vous coach',
  other: 'Autre',
};

export const EVENT_ICONS: Record<EventType, IconName> = {
  training: 'activity',
  competition: 'trophy',
  vet: 'health',
  farrier: 'horseshoe',
  dentist: 'tooth',
  osteopath: 'hand',
  vaccination: 'syringe',
  deworming: 'pill',
  transport: 'truck',
  coach: 'user',
  other: 'calendar',
};

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  flatwork: 'Travail sur le plat',
  jumping: 'Obstacles',
  lunging: 'Longe',
  trail: 'Balade / extérieur',
  groundwork: 'Travail à pied',
  lesson: 'Cours',
  competition: 'Concours',
  rest: 'Détente',
  other: 'Autre',
};

export const RECURRENCE_LABELS: Record<RecurrenceFreq, string> = {
  none: 'Ne se répète pas',
  daily: 'Tous les jours',
  weekly: 'Toutes les semaines',
  monthly: 'Tous les mois',
  yearly: 'Tous les ans',
};

export const FEELING_LABELS = ['', 'Difficile', 'Moyen', 'Correct', 'Bien', 'Excellent'] as const;

/** Transforme un Record de libellés en options de <select>. */
export function options<K extends string>(labels: Record<K, string>): { value: K; label: string }[] {
  return (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
}
