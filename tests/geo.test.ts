import { buildOverpassQuery, distanceKm, formatDistance, parseNominatim, parseOverpass, sortByDistance, viewbox } from '../src/services/geo';

const PARIS = { lat: 48.8566, lon: 2.3522 };
const CHANTILLY = { lat: 49.1947, lon: 2.4711 };

describe('géolocalisation', () => {
  it('calcule les distances à vol d’oiseau', () => {
    expect(distanceKm(PARIS, CHANTILLY)).toBeGreaterThan(37);
    expect(distanceKm(PARIS, CHANTILLY)).toBeLessThan(39);
    expect(distanceKm(PARIS, PARIS)).toBe(0);
  });

  it('formate les distances', () => {
    expect(formatDistance(0.42)).toBe('420 m');
    expect(formatDistance(3.456)).toBe('3,5 km');
    expect(formatDistance(38.2)).toBe('38 km');
  });

  it('trie du plus proche au plus loin, sans position à la fin', () => {
    const items: { n: string; lat?: number; lon?: number }[] = [{ n: 'loin', ...CHANTILLY }, { n: 'sans' }, { n: 'ici', ...PARIS }];
    const sorted = sortByDistance(items, PARIS);
    expect(sorted.map((s) => s.n)).toEqual(['ici', 'loin', 'sans']);
  });

  it('construit une requête Overpass bornée au rayon', () => {
    const q = buildOverpassQuery('farrier', PARIS, 20);
    expect(q).toContain('node["craft"="farrier"](around:20000,48.85660,2.35220);');
    expect(q).toContain('out center tags');
  });

  it('calcule une boîte de recherche autour du point', () => {
    const [left, top, right, bottom] = viewbox(PARIS, 11.1).split(',').map(Number);
    expect(top - PARIS.lat).toBeCloseTo(0.1, 3);
    expect(PARIS.lat - bottom).toBeCloseTo(0.1, 3);
    expect(right - left).toBeGreaterThan(0.29); // les degrés de longitude sont plus courts à Paris
  });

  it('lit Nominatim en gardant uniquement les vrais vétérinaires dans le rayon', () => {
    const base = { osm_type: 'node', display_name: '' };
    const places = parseNominatim(
      [
        { ...base, osm_id: 1, lat: '48.86', lon: '2.35', name: 'Clinique vétérinaire du Marais', category: 'amenity', type: 'veterinary', extratags: { phone: '01 00 00 00 00' }, address: { house_number: '3', road: 'rue X', postcode: '75004', city: 'Paris' } },
        { ...base, osm_id: 2, lat: '48.87', lon: '2.36', name: 'Rue du Vétérinaire', category: 'highway', type: 'residential' },
        { ...base, osm_id: 3, lat: '49.19', lon: '2.47', name: 'Clinique de Chantilly', category: 'amenity', type: 'veterinary' }, // 38 km : hors rayon
        { ...base, osm_id: 4, lat: '48.85', lon: '2.34', category: 'amenity', type: 'veterinary' }, // sans nom
      ],
      'vet',
      PARIS,
      20,
    );
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({ name: 'Clinique vétérinaire du Marais', phone: '01 00 00 00 00', address: '3 rue X, 75004 Paris', osmId: 'node/1' });
  });

  it('lit la réponse OpenStreetMap et ignore les lieux sans nom', () => {
    const places = parseOverpass(
      {
        elements: [
          { type: 'way', id: 2, center: CHANTILLY, tags: { name: 'Clinique équine de Chantilly', phone: '+33 3 00 00 00 00', 'addr:city': 'Chantilly', 'addr:postcode': '60500' } },
          { type: 'node', id: 1, lat: 48.86, lon: 2.35, tags: { name: 'Cabinet vétérinaire du centre' } },
          { type: 'node', id: 3, lat: 48.87, lon: 2.36, tags: {} },
        ],
      },
      'vet',
      PARIS,
    );
    expect(places.map((p) => p.name)).toEqual(['Cabinet vétérinaire du centre', 'Clinique équine de Chantilly']);
    expect(places[1]).toMatchObject({ osmId: 'way/2', phone: '+33 3 00 00 00 00', address: '60500 Chantilly' });
  });
});
