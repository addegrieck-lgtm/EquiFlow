import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FILE_SCHEMA, db } from './db';
import { LOCAL_OWNER, newId } from './repo';
import type { StoredFile } from '../domain/models';

const MAX_IMAGE_SIDE = 1600;
const THUMB_SIDE = 360;
/** Au-delà, on prévient : le stockage d'un iPhone pour une PWA n'est pas illimité. */
export const LARGE_FILE_BYTES = 80 * 1024 * 1024;

async function resize(blob: Blob, maxSide: number, quality: number): Promise<Blob | undefined> {
  if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') return undefined;
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return await new Promise<Blob | undefined>((res) => canvas.toBlob((b) => res(b ?? undefined), 'image/jpeg', quality));
  } catch {
    return undefined; // format non décodable (HEIC sur certains navigateurs…) : on garde l'original
  }
}

/** Enregistre un fichier ; les photos sont réduites (1600 px) et reçoivent une miniature. */
export async function storeFile(blob: Blob, name: string): Promise<StoredFile> {
  let data = blob;
  let thumbnail: Blob | undefined;
  let mime = blob.type || 'application/octet-stream';
  if (mime.startsWith('image/') && mime !== 'image/gif') {
    const reduced = await resize(blob, MAX_IMAGE_SIDE, 0.84);
    if (reduced && reduced.size < blob.size) {
      data = reduced;
      mime = 'image/jpeg';
    }
    thumbnail = await resize(blob, THUMB_SIDE, 0.75);
  }
  const t = new Date().toISOString();
  const file = FILE_SCHEMA.parse({
    id: newId(),
    ownerId: LOCAL_OWNER,
    createdAt: t,
    updatedAt: t,
    version: 1,
    name,
    mime,
    size: data.size,
    blob: data,
    thumbnail,
  });
  await db.files.add(file);
  return file;
}

export async function deleteFiles(ids: (string | undefined)[]): Promise<void> {
  const list = ids.filter((x): x is string => Boolean(x));
  if (list.length) await db.files.bulkDelete(list);
}

/** URL temporaire (object URL) d'un fichier stocké, libérée automatiquement. */
export function useFileUrl(id: string | undefined, thumb = false): string | undefined {
  const file = useLiveQuery(() => (id ? db.files.get(id) : undefined), [id]);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const blob = file ? (thumb && file.thumbnail) || file.blob : undefined;
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file, thumb]);
  return url;
}

export function useStoredFile(id: string | undefined): StoredFile | undefined {
  return useLiveQuery(() => (id ? db.files.get(id) : undefined), [id]);
}
