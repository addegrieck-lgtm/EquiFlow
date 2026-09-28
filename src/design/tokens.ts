/**
 * Design tokens EQUIFLOW — source unique de vérité.
 * Les variables CSS (--color-*, --space-*…) sont générées à partir de ce fichier (voir theme.ts),
 * et les contrastes sont vérifiés par tests/tokens.test.ts.
 */

/** Palette de marque (valeurs brutes, ne pas utiliser directement dans les composants). */
export const brand = {
  ink: '#0E0F0D', // noir profond
  paper: '#F5F1EA', // blanc cassé
  forest: '#1F3D2B', // vert forêt — couleur de marque
  sand: '#D8C7A6', // beige sable
  gold: '#B8964E', // accent doré discret
} as const;

export type ColorScheme = 'light' | 'dark';

/** Rôles sémantiques : les composants n'utilisent que ceux-ci. */
export interface SemanticColors {
  bg: string; // fond de l'app
  surface: string; // cartes, feuilles
  surface2: string; // zones en retrait, champs
  border: string;
  text: string;
  textMuted: string;
  brand: string; // aplats de marque (boutons primaires)
  onBrand: string; // texte sur aplat de marque
  brandText: string; // texte / icônes accentués en couleur de marque
  gold: string; // filets, badges premium
  goldText: string; // texte doré lisible
  success: string;
  warning: string;
  danger: string;
  successBg: string;
  warningBg: string;
  dangerBg: string;
  overlay: string;
}

export const colors: Record<ColorScheme, SemanticColors> = {
  light: {
    bg: brand.paper,
    surface: '#FFFDF9',
    surface2: '#ECE6DB',
    border: '#DDD4C4',
    text: brand.ink,
    textMuted: '#5A5D53',
    brand: brand.forest,
    onBrand: brand.paper,
    brandText: brand.forest,
    gold: brand.gold,
    goldText: '#7F6428',
    success: '#3F6B4B',
    warning: '#8F5B12',
    danger: '#A4442C',
    successBg: '#E3ECE2',
    warningBg: '#F4E7CF',
    dangerBg: '#F5DED6',
    overlay: 'rgba(14, 15, 13, 0.45)',
  },
  dark: {
    bg: brand.ink,
    surface: '#171915',
    surface2: '#20231E',
    border: '#2F332C',
    text: brand.paper,
    textMuted: '#A7A99D',
    brand: '#2E5A3F',
    onBrand: brand.paper,
    brandText: '#9CC5A8',
    gold: '#C9A862',
    goldText: '#D6B973',
    success: '#8FC29D',
    warning: '#E0B15E',
    danger: '#E58C74',
    successBg: '#1D2B21',
    warningBg: '#2E2517',
    dangerBg: '#301D18',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

/** Grille de 4 px. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const font = {
  display: "'Fraunces Variable', 'Iowan Old Style', Georgia, serif",
  body: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

/** Échelle typographique : [taille px, interligne]. */
export const type = {
  display: [32, 1.15],
  title: [24, 1.2],
  heading: [19, 1.3],
  body: [16, 1.5],
  small: [14, 1.45],
  caption: [12, 1.4],
} as const;

/** Taille tactile minimale (recommandations Apple / WCAG). */
export const TOUCH_MIN = 44;
