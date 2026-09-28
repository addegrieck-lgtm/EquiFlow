import { useEffect, useState } from 'react';

/** Onglets principaux de la barre de navigation. */
export const TABS = ['home', 'horse', 'sessions', 'agenda', 'more'] as const;
export type Tab = (typeof TABS)[number];

export interface Location {
  /** Premier segment de l'URL (#/horse/…) */
  tab: Tab;
  /** Segments suivants (#/more/design → ['design']) */
  path: string[];
}

/** Routage par hash : compatible GitHub Pages sans configuration serveur. */
export function parseHash(hash: string): Location {
  const segments = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
  const [first, ...path] = segments;
  const tab = (TABS as readonly string[]).includes(first ?? '') ? (first as Tab) : 'home';
  return { tab, path: tab === first ? path : [] };
}

export function toHash(tab: Tab, ...path: string[]): string {
  return `#/${[tab, ...path].map(encodeURIComponent).join('/')}`;
}

export function navigate(tab: Tab, ...path: string[]): void {
  const target = toHash(tab, ...path);
  if (window.location.hash !== target) window.location.hash = target;
  window.scrollTo({ top: 0 });
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
