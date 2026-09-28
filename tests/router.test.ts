import { parseHash, toHash } from '../src/app/router';

describe('parseHash', () => {
  it('ouvre l’accueil par défaut', () => {
    expect(parseHash('')).toEqual({ tab: 'home', path: [] });
    expect(parseHash('#/')).toEqual({ tab: 'home', path: [] });
  });

  it('lit l’onglet et les segments', () => {
    expect(parseHash('#/more/design')).toEqual({ tab: 'more', path: ['design'] });
    expect(parseHash('#/horse/abc-123/health')).toEqual({ tab: 'horse', path: ['abc-123', 'health'] });
  });

  it('renvoie à l’accueil pour une route inconnue, sans garder ses segments', () => {
    expect(parseHash('#/inconnu/x')).toEqual({ tab: 'home', path: [] });
  });

  it('fait l’aller-retour avec toHash, y compris avec des caractères spéciaux', () => {
    const hash = toHash('horse', 'Spirit du Bois', 'santé');
    expect(parseHash(hash)).toEqual({ tab: 'horse', path: ['Spirit du Bois', 'santé'] });
  });
});
