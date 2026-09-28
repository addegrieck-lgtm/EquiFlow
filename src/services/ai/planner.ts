/**
 * Proposition d'une semaine d'entraînement à partir de la discipline, des objectifs et de la
 * charge récente. C'est une SUGGESTION générique, à adapter avec son coach ; elle n'est jamais
 * proposée pour un cheval déclaré blessé ou au repos.
 */
import type { Discipline, Goal, Horse, TrainingSession } from '../../domain/models';
import { addDays, fromIso } from '../../lib/dates';
import { inLastDays } from '../progress';
import type { PlanItem } from './types';

interface Template {
  title: string;
  durationMin: number;
  notes: string;
}

const FLAT: Template = { title: 'Plat : transitions et équilibre', durationMin: 40, notes: 'Détente 10 min au pas, transitions pas-trot-galop, cercles, allongements/raccourcis, retour au calme.' };
const TRANSITIONS: Template = { title: 'Transitions trot-galop', durationMin: 35, notes: 'Transitions nombreuses et nettes sur des figures simples ; récompenser la réactivité.' };
const LATERAL: Template = { title: 'Figures et travail latéral', durationMin: 45, notes: 'Serpentines, épaule en dedans, cessions à la jambe ; pauses rênes longues entre les exercices.' };
const POLES: Template = { title: 'Barres au sol et cavalettis', durationMin: 35, notes: 'Cadence et équilibre sur barres au sol puis cavalettis ; peu de répétitions, bien espacées.' };
const GYM: Template = { title: 'Gymnastique sur petites lignes', durationMin: 40, notes: 'Lignes d’obstacles modestes ; privilégier la qualité des abords à la hauteur.' };
const TRAIL: Template = { title: 'Extérieur / détente', durationMin: 60, notes: 'Balade au pas et au trot, terrain varié ; séance mentale et de condition.' };
const HILLS: Template = { title: 'Travail en extérieur et côtes', durationMin: 50, notes: 'Montées au pas puis au trot pour le dos et l’arrière-main.' };
const GROUND: Template = { title: 'Longe ou travail à pied', durationMin: 25, notes: 'Séance courte : décontraction, écoute, transitions à la voix.' };

const BY_DISCIPLINE: Record<Discipline, Template[]> = {
  jumping: [FLAT, POLES, TRAIL, GYM],
  dressage: [TRANSITIONS, LATERAL, TRAIL, FLAT],
  eventing: [FLAT, GYM, HILLS, POLES],
  leisure: [TRAIL, FLAT, GROUND, POLES],
  trail: [TRAIL, HILLS, FLAT, GROUND],
  endurance: [HILLS, TRAIL, FLAT, GROUND],
  western: [FLAT, GROUND, TRAIL, TRANSITIONS],
  horseball: [FLAT, POLES, TRAIL, TRANSITIONS],
  driving: [GROUND, FLAT, TRAIL, TRANSITIONS],
  other: [FLAT, GROUND, TRAIL, POLES],
};

export interface PlanResult {
  items: PlanItem[];
  notes: string[];
  blocked?: string;
}

/** Jours visés : mardi, jeudi, samedi (+ dimanche si l'objectif est ambitieux). */
const TARGET_DAYS = [2, 4, 6, 0];

export function planWeek(horse: Horse, goals: Goal[], sessions: TrainingSession[], today: string): PlanResult {
  if (horse.status === 'injured' || horse.status === 'resting') {
    return {
      items: [],
      notes: [],
      blocked: `${horse.name} est déclaré « ${horse.status === 'injured' ? 'convalescent' : 'au repos'} ». Je ne propose pas de programme : la reprise se décide avec votre vétérinaire.`,
    };
  }
  const recent = inLastDays(sessions.filter((s) => s.horseId === horse.id), 14, today);
  const notes: string[] = [];
  const ambitious = goals.includes('competition') || goals.includes('progress');
  let count = ambitious ? 4 : 3;
  let factor = 1;
  if (recent.length <= 1) {
    factor = 0.75;
    count = 3;
    notes.push('Peu de séances ces deux dernières semaines : durées réduites pour une reprise progressive.');
  }
  if (goals.includes('fitness')) factor = Math.min(factor, 0.85);
  if (inLastDays(recent, 7, today).length >= 5) {
    count = 3;
    notes.push('Semaine précédente chargée : au moins un jour de repos complet entre les séances.');
  }

  const templates = BY_DISCIPLINE[horse.discipline ?? 'other'];
  const days = TARGET_DAYS.slice(0, count);
  const items: PlanItem[] = [];
  for (let i = 1; i <= 7 && items.length < count; i++) {
    const date = addDays(today, i);
    if (!days.includes(fromIso(date).getUTCDay())) continue;
    const t = templates[items.length % templates.length];
    items.push({ date, title: t.title, durationMin: Math.round((t.durationMin * factor) / 5) * 5, notes: t.notes, type: 'training' });
  }
  notes.push('Proposition générique à adapter avec votre coach selon l’état et le niveau de votre cheval.');
  return { items, notes };
}
