/** Bibliothèque d'exercices courants, proposés en un geste lors de la saisie d'une séance. */
import type { Discipline } from '../domain/models';

export const EXERCISES: { label: string; disciplines: Discipline[] | 'all' }[] = [
  { label: 'Transitions', disciplines: 'all' },
  { label: 'Transitions trot-galop', disciplines: 'all' },
  { label: 'Cercles et voltes', disciplines: 'all' },
  { label: 'Serpentines', disciplines: 'all' },
  { label: 'Allongements / raccourcis', disciplines: 'all' },
  { label: 'Travail des rênes longues', disciplines: 'all' },
  { label: 'Épaule en dedans', disciplines: ['dressage', 'eventing', 'jumping'] },
  { label: 'Cessions à la jambe', disciplines: ['dressage', 'eventing', 'jumping', 'leisure'] },
  { label: 'Appuyers', disciplines: ['dressage', 'eventing'] },
  { label: 'Changements de pied', disciplines: ['dressage', 'eventing', 'jumping'] },
  { label: 'Contre-galop', disciplines: ['dressage', 'eventing', 'jumping'] },
  { label: 'Reculer', disciplines: 'all' },
  { label: 'Barres au sol', disciplines: 'all' },
  { label: 'Cavalettis', disciplines: 'all' },
  { label: 'Gymnastique (lignes)', disciplines: ['jumping', 'eventing'] },
  { label: 'Parcours', disciplines: ['jumping', 'eventing'] },
  { label: 'Tournants courts', disciplines: ['jumping', 'eventing'] },
  { label: 'Abords / trajectoires', disciplines: ['jumping', 'eventing'] },
  { label: 'Cross / terrain varié', disciplines: ['eventing', 'trail', 'endurance'] },
  { label: 'Travail en côtes', disciplines: ['eventing', 'trail', 'endurance', 'leisure'] },
  { label: 'Galop de condition', disciplines: ['eventing', 'endurance'] },
  { label: 'Longe', disciplines: 'all' },
  { label: 'Travail à pied', disciplines: 'all' },
  { label: 'Désensibilisation', disciplines: 'all' },
];

export function exercisesFor(discipline: Discipline): string[] {
  return EXERCISES.filter((e) => e.disciplines === 'all' || e.disciplines.includes(discipline)).map((e) => e.label);
}
