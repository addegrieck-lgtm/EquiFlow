import type { IconName } from '../design/components';

export interface QuickAction {
  id: string;
  label: string;
  icon: IconName;
  /** Étape de la roadmap (docs/SPEC.md §O) où l'action devient disponible. */
  availableAt: string;
  /** Hash de destination une fois l'action disponible. */
  href?: string;
}

/** Actions rapides du bouton « + » et de l'accueil (SPEC §7). */
export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'session', label: 'Ajouter une séance', icon: 'activity', availableAt: 'Étape 6' },
  { id: 'scan', label: 'Scanner un document', icon: 'scan', availableAt: 'Étape 4' },
  { id: 'expense', label: 'Ajouter une dépense', icon: 'euro', availableAt: 'Étape 5' },
  { id: 'event', label: 'Planifier un rendez-vous', icon: 'calendar', availableAt: 'Étape 7' },
  { id: 'ai', label: 'Demander à l’IA', icon: 'sparkle', availableAt: 'Étape 9' },
  { id: 'video', label: 'Filmer une séance', icon: 'video', availableAt: 'V2' },
];
