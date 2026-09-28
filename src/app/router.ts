import { useEffect, useState } from 'react';

/** Onglets principaux de la barre de navigation. */
export const TABS = ['home', 'horse', 'sessions', 'agenda', 'more'] as const;
export type Tab = (typeof TABS)[number];

/** Écrans de premier niveau : les onglets + écrans plein écran ouverts depuis l'accueil. */
export const SCREENS = [...TABS, 'ai', 'scan', 'search'] as const;
export type Screen = (typeof SCREENS)[number];

export interface Location {
  /** Premier segment de l'URL (#/horse/…) */
  tab: Screen;
  /** Segments suivants (#/more/design → ['design']) */
  path: string[];
}

/** Routage par hash : compatible GitHub Pages sans configuration serveur. */
export function parseHash(hash: string): Location {
  const segments = hash
    .replace(/^#\/?/, '')
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
  const [first, ...path] = segments;
  const tab = (SCREENS as readonly string[]).includes(first ?? '') ? (first as Screen) : 'home';
  return { tab, path: tab === first ? path : [] };
}

export function toHash(tab: Screen, ...path: (string | undefined)[]): string {
  return `#/${[tab, ...path.filter((p): p is string => Boolean(p))].map(encodeURIComponent).join('/')}`;
}

export function navigate(tab: Screen, ...path: (string | undefined)[]): void {
  const target = toHash(tab, ...path);
  if (window.location.hash !== target) window.location.hash = target;
  window.scrollTo({ top: 0 });
}

/** Retour à l'écran précédent (ou à un repli si l'historique est vide, ex. lien ouvert directement). */
export function goBack(fallback: string): void {
  if (window.history.length > 1) window.history.back();
  else window.location.hash = fallback;
}

export function useLocation(): Location {
  const [loc, setLoc] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setLoc(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return loc;
}
