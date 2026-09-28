/**
 * Localisation et recherche de professionnels à proximité — gratuite, sans clé :
 * - position : API de géolocalisation du navigateur (avec l'accord de l'utilisateur) ;
 * - lieux : OpenStreetMap via Overpass (données ouvertes, contributives, donc incomplètes) ;
 * - adresses → coordonnées : Nominatim (OpenStreetMap).
 * Ces appels n'ont lieu que sur action explicite de l'utilisateur (bouton « Autour de moi »).
 */
import type { Trade } from '../domain/models';

export interface LatLon {
  lat: number;
  lon: number;
}

export function distanceKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;
}

/** Trie des éléments géolocalisés du plus proche au plus loin ; ceux sans position vont à la fin. */
export function sortByDistance<T extends { lat?: number; lon?: number }>(items: T[], origin: LatLon): (T & { distanceKm?: number })[] {
  return items
    .map((it) => ({ ...it, distanceKm: it.lat !== undefined && it.lon !== undefined ? distanceKm(origin, { lat: it.lat, lon: it.lon }) : undefined }))
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}

// --- Recherche OpenStreetMap ------------------------------------------------------------------

export type NearbyKind = 'vet' | 'farrier' | 'stable' | 'saddlery';

export const NEARBY_KINDS: { kind: NearbyKind; label: string; trade: Trade; hint: string }[] = [
  { kind: 'vet', label: 'Vétérinaires', trade: 'vet', hint: 'Tous les vétérinaires : vérifiez qu’ils soignent les équidés.' },
  { kind: 'farrier', label: 'Maréchaux-ferrants', trade: 'farrier', hint: 'Peu référencés sur OpenStreetMap : la liste peut être courte.' },
  { kind: 'stable', label: 'Écuries & centres équestres', trade: 'boarding', hint: 'Pensions, clubs et centres équestres.' },
  { kind: 'saddlery', label: 'Selleries', trade: 'other', hint: 'Magasins de matériel équestre.' },
];

const FILTERS: Record<NearbyKind, string[]> = {
  vet: ['["amenity"="veterinary"]'],
  farrier: ['["craft"="farrier"]', '["shop"="farrier"]'],
  stable: ['["leisure"="horse_riding"]', '["amenity"="stable"]'],
  saddlery: ['["shop"="equestrian"]', '["craft"="saddler"]'],
};

export function buildOverpassQuery(kind: NearbyKind, origin: LatLon, radiusKm: number): string {
  const around = `(around:${Math.round(radiusKm * 1000)},${origin.lat.toFixed(5)},${origin.lon.toFixed(5)})`;
  const parts = FILTERS[kind].flatMap((f) => [`node${f}${around};`, `way${f}${around};`, `relation${f}${around};`]);
  return `[out:json][timeout:25];(${parts.join('')});out center tags 60;`;
}

export interface Place extends LatLon {
  osmId: string;
  kind: NearbyKind;
  name: string;
  distanceKm: number;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function parseOverpass(json: { elements?: OverpassElement[] }, kind: NearbyKind, origin: LatLon): Place[] {
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const el of json.elements ?? []) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const t = el.tags ?? {};
    const name = t.name ?? t['name:fr'] ?? t.operator;
    if (lat === undefined || lon === undefined || !name) continue; // sans nom : inutilisable pour prendre contact
    const osmId = `${el.type}/${el.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);
    const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
    const city = [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ');
    places.push({
      osmId,
      kind,
      name,
      lat,
      lon,
      distanceKm: distanceKm(origin, { lat, lon }),
      phone: t.phone ?? t['contact:phone'],
      email: t.email ?? t['contact:email'],
      website: t.website ?? t['contact:website'],
      address: [street, city].filter(Boolean).join(', ') || undefined,
    });
  }
  return places.sort((a, b) => a.distanceKm - b.distanceKm);
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function fetchNearby(kind: NearbyKind, origin: LatLon, radiusKm = 25, signal?: AbortSignal): Promise<Place[]> {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: new URLSearchParams({ data: buildOverpassQuery(kind, origin, radiusKm) }),
    signal,
  });
  if (!res.ok) throw new Error(res.status === 429 ? 'Service OpenStreetMap saturé, réessayez dans une minute.' : 'Recherche impossible pour le moment.');
  return parseOverpass(await res.json(), kind, origin);
}

/** Adresse → coordonnées (premier résultat). */
export async function geocode(address: string, signal?: AbortSignal): Promise<(LatLon & { label: string }) | undefined> {
  const url = `${NOMINATIM_URL}?${new URLSearchParams({ q: address, format: 'jsonv2', limit: '1', 'accept-language': 'fr' })}`;
  const res = await fetch(url, { signal, referrerPolicy: 'origin' });
  if (!res.ok) throw new Error('Géocodage impossible pour le moment.');
  const [first] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return first ? { lat: Number(first.lat), lon: Number(first.lon), label: first.display_name } : undefined;
}

export function currentPosition(): Promise<LatLon> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('La localisation n’est pas disponible sur cet appareil.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? 'Localisation refusée. Autorisez-la dans Réglages > Safari > Position, ou saisissez une adresse.'
              : 'Position introuvable. Réessayez ou saisissez une adresse.',
          ),
        ),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  });
}
