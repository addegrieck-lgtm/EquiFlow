import type { IconName } from '../design/components';

export interface QuickAction {
  id: string;
  label: string;
  icon: IconName;
  href: string;
}

/** Actions rapides du bouton « + » et de l'accueil (SPEC §7). */
export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'session', label: 'Ajouter une séance', icon: 'activity', href: '#/sessions/new' },
  { id: 'live', label: 'Démarrer le chrono', icon: 'clock', href: '#/sessions/live' },
  { id: 'scan', label: 'Scanner un document', icon: 'scan', href: '#/scan' },
  { id: 'expense', label: 'Ajouter une dépense', icon: 'euro', href: '#/more/expenses/new' },
  { id: 'event', label: 'Prendre rendez-vous', icon: 'calendar', href: '#/agenda/new' },
  { id: 'ai', label: 'Demander à l’IA', icon: 'sparkle', href: '#/ai' },
];
