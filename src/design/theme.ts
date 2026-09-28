import { useSyncExternalStore } from 'react';
import { colors, font, radius, space, type, type ColorScheme, type SemanticColors } from './tokens';

export type ThemePreference = 'system' | ColorScheme;

const STORAGE_KEY = 'equiflow.theme';
const kebab = (s: string) => s.replace(/[A-Z0-9]/g, (m) => `-${m.toLowerCase()}`);

/** Construit la feuille de variables CSS à partir des tokens. */
export function buildThemeCss(): string {
  const vars = (c: SemanticColors) =>
    Object.entries(c)
      .map(([k, v]) => `--color-${kebab(k)}:${v};`)
      .join('');
  const scale = [
    ...Object.entries(space).map(([k, v]) => `--space-${k}:${v}px;`),
    ...Object.entries(radius).map(([k, v]) => `--radius-${k}:${v}px;`),
    ...Object.entries(type).map(([k, [size, lh]]) => `--text-${k}:${size}px;--leading-${k}:${lh};`),
    `--font-display:${font.display};`,
    `--font-body:${font.body};`,
  ].join('');
  return [
    `:root{${scale}${vars(colors.light)}color-scheme:light;}`,
    `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${vars(colors.dark)}color-scheme:dark;}}`,
    `:root[data-theme="dark"]{${vars(colors.dark)}color-scheme:dark;}`,
  ].join('\n');
}

export function injectThemeCss(): void {
  const el = document.createElement('style');
  el.id = 'equiflow-tokens';
  el.textContent = buildThemeCss();
  document.head.prepend(el);
}

// --- Préférence clair / sombre / système -----------------------------------------------------

const listeners = new Set<() => void>();

function read(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function resolved(pref: ThemePreference): ColorScheme {
  if (pref !== 'system') return pref;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Applique la préférence au document (attribut data-theme + couleur de la barre d'état). */
export function applyTheme(pref: ThemePreference = read()): void {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors[resolved(pref)].bg);
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    if (pref === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* stockage indisponible (navigation privée) : la préférence vaut pour la session */
  }
  applyTheme(pref);
  listeners.forEach((l) => l());
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
  );
}

/** Suit le changement de thème du système quand la préférence est « système ». */
export function watchSystemTheme(): void {
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (read() === 'system') applyTheme('system');
  });
}
