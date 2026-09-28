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

/**
 * Recherche par catégorie via Nominatim (« phrases spéciales » OpenStreetMap), plus fiable depuis
 * un navigateur qu'Overpass. Seules les catégories réellement équestres / vétérinaires sont gardées.
 */
const NOMINATIM_SEARCH: Partial<Record<NearbyKind, { phrase: string; accept: (category: string, type: string) => boolean }>> = {
  vet: { phrase: 'vétérinaire', accept: (c, t) => c === 'amenity' && t === 'veterinary' },
  stable: { phrase: 'centre équestre', accept: (c, t) => (c === 'leisure' && t === 'horse_riding') || (c === 'amenity' && t === 'stable') },
};

export interface NominatimResult {
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  category: string;
  type: string;
  extratags?: Record<string, string> | null;
  address?: Record<string, string>;
}

/** Boîte englobante (gauche, haut, droite, bas) d'un cercle de rayon r km. */
export function viewbox(origin: LatLon, radiusKm: number): string {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.max(0.2, Math.cos((origin.lat * Math.PI) / 180)));
  return [origin.lon - dLon, origin.lat + dLat, origin.lon + dLon, origin.lat - dLat].map((n) => n.toFixed(4)).join(',');
}

export function parseNominatim(results: NominatimResult[], kind: NearbyKind, origin: LatLon, radiusKm: number): Place[] {
  const spec = NOMINATIM_SEARCH[kind];
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const r of results) {
    if (spec && !spec.accept(r.category, r.type)) continue;
    const name = r.name?.trim();
    if (!name) continue;
    const osmId = `${r.osm_type}/${r.osm_id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    const d = distanceKm(origin, { lat, lon });
    if (d > radiusKm) continue; // la boîte est carrée : on retire les coins hors du cercle
    const a = r.address ?? {};
    const t = r.extratags ?? {};
    const street = [a.house_number, a.road].filter(Boolean).join(' ');
    const city = [a.postcode, a.city ?? a.town ?? a.village ?? a.municipality].filter(Boolean).join(' ');
    places.push({
      osmId,
      kind,
      name,
      lat,
      lon,
      distanceKm: d,
      phone: t.phone ?? t['contact:phone'],
      email: t.email ?? t['contact:email'],
      website: t.website ?? t['contact:website'],
      address: [street, city].filter(Boolean).join(', ') || undefined,
    });
  }
  return places.sort((a, b) => a.distanceKm - b.distanceKm);
}

async function fetchNominatim(kind: NearbyKind, origin: LatLon, radiusKm: number, signal?: AbortSignal): Promise<Place[]> {
  const spec = NOMINATIM_SEARCH[kind]!;
  const params = new URLSearchParams({
    q: spec.phrase,
    format: 'jsonv2',
    viewbox: viewbox(origin, radiusKm),
    bounded: '1',
    limit: '50',
    extratags: '1',
    addressdetails: '1',
    'accept-language': 'fr',
  });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, { signal, referrerPolicy: 'origin' });
  if (!res.ok) throw new Error('Recherche impossible pour le moment, réessayez dans une minute.');
  return parseNominatim(await res.json(), kind, origin, radiusKm);
}

async function fetchOverpass(kind: NearbyKind, origin: LatLon, radiusKm: number, signal?: AbortSignal): Promise<Place[]> {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: new URLSearchParams({ data: buildOverpassQuery(kind, origin, radiusKm) }),
    signal,
  });
  if (!res.ok) throw new Error(res.status === 429 ? 'Service OpenStreetMap saturé, réessayez dans une minute.' : 'Recherche impossible pour le moment.');
  return parseOverpass(await res.json(), kind, origin);
}

export async function fetchNearby(kind: NearbyKind, origin: LatLon, radiusKm = 25, signal?: AbortSignal): Promise<Place[]> {
  if (NOMINATIM_SEARCH[kind]) return fetchNominatim(kind, origin, radiusKm, signal);
  // Maréchaux et selleries : Overpass, souvent saturé ; délai court et message clair.
  const timeout = AbortSignal.timeout?.(15_000);
  try {
    return await fetchOverpass(kind, origin, radiusKm, signal ?? timeout);
  } catch {
    throw new Error('Le service OpenStreetMap pour cette catégorie ne répond pas. Ces professionnels y sont de toute façon peu référencés : demandez à votre écurie ou ajoutez-les à la main.');
  }
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
