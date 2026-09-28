import { buildOverpassQuery, distanceKm, formatDistance, parseOverpass, sortByDistance } from '../src/services/geo';

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
    const sorted = sortByDistance([{ n: 'loin', ...CHANTILLY }, { n: 'sans' }, { n: 'ici', ...PARIS }], PARIS);
    expect(sorted.map((s) => s.n)).toEqual(['ici', 'loin', 'sans']);
  });

  it('construit une requête Overpass bornée au rayon', () => {
    const q = buildOverpassQuery('farrier', PARIS, 20);
    expect(q).toContain('node["craft"="farrier"](around:20000,48.85660,2.35220);');
    expect(q).toContain('out center tags');
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
