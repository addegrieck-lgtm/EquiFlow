/**
 * Sauvegarde, restauration et suppression totale (RGPD : portabilité et effacement).
 * Le fichier exporté est un JSON autonome ; les fichiers (photos, PDF) y sont encodés en base64.
 */
import type { Table } from 'dexie';
import { z } from 'zod';
import { FILE_SCHEMA, RECORD_TABLES, db, type RecordTableName } from '../data/db';

export const BACKUP_FORMAT = 'equiflow-backup';
export const BACKUP_VERSION = 1;

const fileEntrySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  name: z.string(),
  mime: z.string(),
  size: z.number(),
  data: z.string(), // base64
  thumbnail: z.string().optional(),
});

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().max(BACKUP_VERSION, 'Sauvegarde créée par une version plus récente d’EQUIFLOW'),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.unknown())),
  settings: z.array(z.object({ key: z.string(), value: z.unknown() })),
  files: z.array(fileEntrySchema),
});

export type Backup = z.infer<typeof backupSchema>;

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function exportBackup({ includeFiles = true } = {}): Promise<Backup> {
  const tables: Record<string, unknown[]> = {};
  for (const name of Object.keys(RECORD_TABLES) as RecordTableName[]) tables[name] = await db[name].toArray();
  const files = includeFiles
    ? await Promise.all(
        (await db.files.toArray()).map(async ({ blob, thumbnail, ...meta }) => ({
          ...meta,
          data: await blobToBase64(blob),
          thumbnail: thumbnail ? await blobToBase64(thumbnail) : undefined,
        })),
      )
    : [];
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
    settings: await db.settings.toArray(),
    files,
  };
}

export interface ImportReport {
  records: number;
  files: number;
}

/**
 * Remplace toutes les données par celles de la sauvegarde. Tout est validé AVANT d'effacer quoi
 * que ce soit : une sauvegarde invalide ne touche pas aux données existantes.
 */
export async function importBackup(raw: unknown): Promise<ImportReport> {
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Ce fichier n’est pas une sauvegarde EQUIFLOW valide.');
  const backup = parsed.data;

  const validated: Partial<Record<RecordTableName, unknown[]>> = {};
  let records = 0;
  for (const name of Object.keys(RECORD_TABLES) as RecordTableName[]) {
    const rows = backup.tables[name] ?? [];
    validated[name] = rows.map((row, i) => {
      const res = RECORD_TABLES[name].safeParse(row);
      if (!res.success) throw new Error(`Sauvegarde corrompue (${name}, ligne ${i + 1}).`);
      return res.data;
    });
    records += rows.length;
  }
  const files = backup.files.map(({ data, thumbnail, ...meta }) =>
    FILE_SCHEMA.parse({ ...meta, blob: base64ToBlob(data, meta.mime), thumbnail: thumbnail ? base64ToBlob(thumbnail, 'image/jpeg') : undefined }),
  );

  const all = [...Object.keys(RECORD_TABLES).map((n) => db[n as RecordTableName]), db.files, db.settings];
  await db.transaction('rw', all, async () => {
    for (const t of all) await t.clear();
    for (const name of Object.keys(validated) as RecordTableName[]) {
      await (db[name] as unknown as Table<unknown, string>).bulkAdd(validated[name] ?? []);
    }
    await db.files.bulkAdd(files);
    await db.settings.bulkAdd(backup.settings);
  });
  return { records, files: files.length };
}

/** Efface définitivement toutes les données EQUIFLOW de cet appareil. */
export async function wipeAllData(): Promise<void> {
  const all = [...Object.keys(RECORD_TABLES).map((n) => db[n as RecordTableName]), db.files, db.settings];
  await db.transaction('rw', all, async () => {
    for (const t of all) await t.clear();
  });
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('equiflow.'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* stockage indisponible */
  }
}

export function backupFileName(date = new Date()): string {
  return `equiflow-sauvegarde-${date.toISOString().slice(0, 10)}.json`;
}
