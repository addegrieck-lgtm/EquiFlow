/**
 * Accès aux données : création / modification / suppression validées par Zod.
 * Cette couche est la seule à connaître Dexie ; en V1.5 une implémentation Supabase
 * exposera les mêmes fonctions (docs/SPEC.md §I.2).
 */
import type { Table } from 'dexie';
import type { z } from 'zod';
import type { BaseKeys } from '../domain/models';
import { db, RECORD_TABLES, type RecordTableName } from './db';

/** Propriétaire des données en V1 (profil local unique). Remplacé par l'id Supabase en V1.5. */
export const LOCAL_OWNER = 'local';

type Row<N extends RecordTableName> = z.infer<(typeof RECORD_TABLES)[N]>;
export type Draft<N extends RecordTableName> = Omit<Row<N>, BaseKeys> & { id?: string };

export class ValidationError extends Error {
  constructor(public issues: { path: string; message: string }[]) {
    super(issues.map((i) => `${i.path} : ${i.message}`).join(' · '));
    this.name = 'ValidationError';
  }
}

export const newId = (): string => crypto.randomUUID();
const now = () => new Date().toISOString();

function table<N extends RecordTableName>(name: N): Table<Row<N>, string> {
  return db[name] as unknown as Table<Row<N>, string>;
}

function validate<N extends RecordTableName>(name: N, value: unknown): Row<N> {
  const res = RECORD_TABLES[name].safeParse(value);
  if (!res.success) {
    throw new ValidationError(res.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  return res.data as Row<N>;
}

/** Retire les champs vides ('' / undefined) : les schémas considèrent « absent » plutôt que « vide ». */
export function clean<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as T;
}

export async function create<N extends RecordTableName>(name: N, draft: Draft<N>): Promise<Row<N>> {
  const t = now();
  const row = validate(name, { ...clean(draft), id: draft.id ?? newId(), ownerId: LOCAL_OWNER, createdAt: t, updatedAt: t, version: 1 });
  await table(name).add(row);
  return row;
}

export async function update<N extends RecordTableName>(name: N, id: string, patch: Partial<Draft<N>>): Promise<Row<N>> {
  const current = await table(name).get(id);
  if (!current) throw new Error(`Élément introuvable (${name}/${id})`);
  // Les champs explicitement vidés (undefined ou '') sont supprimés.
  const merged: Record<string, unknown> = { ...current, ...patch };
  for (const [k, v] of Object.entries(patch)) if (v === undefined || v === '') delete merged[k];
  const row = validate(name, { ...merged, id, updatedAt: now(), version: (current as { version: number }).version + 1 });
  await table(name).put(row);
  return row;
}

/**
 * Suppression définitive (V1 : aucune synchronisation, donc pas besoin de conserver une trace).
 * En V1.5, remplacée par une suppression douce (deletedAt) propagée aux autres appareils.
 */
export async function remove(name: RecordTableName, id: string): Promise<void> {
  await table(name).delete(id);
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.settings.get(key);
  return s === undefined ? fallback : (s.value as T);
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}
