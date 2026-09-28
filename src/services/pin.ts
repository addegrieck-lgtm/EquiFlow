/**
 * Code PIN optionnel à l'ouverture. Dérivation PBKDF2 (WebCrypto) avec sel aléatoire :
 * le code n'est jamais stocké en clair. Protège d'un regard indiscret, pas d'un accès
 * technique à un téléphone déverrouillé (les données ne sont pas chiffrées en V1).
 */
import { db } from '../data/db';
import { setSetting } from '../data/repo';

export const PIN_KEY = 'security.pin';
const UNLOCK_KEY = 'equiflow.unlocked';

interface PinRecord {
  salt: string;
  hash: string;
}

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function derive(pin: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150_000, hash: 'SHA-256' }, key, 256);
  return toHex(bits);
}

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin);

export async function setPin(pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error('Le code doit comporter 4 à 6 chiffres.');
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  await setSetting(PIN_KEY, { salt, hash: await derive(pin, salt) } satisfies PinRecord);
  markUnlocked();
}

export async function clearPin(): Promise<void> {
  await db.settings.delete(PIN_KEY);
}

export async function checkPin(pin: string): Promise<boolean> {
  const rec = (await db.settings.get(PIN_KEY))?.value as PinRecord | undefined;
  if (!rec) return true;
  return (await derive(pin, rec.salt)) === rec.hash;
}

/** Déverrouillé pour la session en cours (jusqu'à la fermeture de l'app). */
export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* navigation privée */
  }
}
