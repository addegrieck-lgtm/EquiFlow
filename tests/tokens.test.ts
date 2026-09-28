import { colors, type ColorScheme } from '../src/design/tokens';
import { contrastRatio } from '../src/design/contrast';
import { buildThemeCss } from '../src/design/theme';

// WCAG AA : 4,5 pour le texte courant.
const TEXT = 4.5;

describe.each(['light', 'dark'] as ColorScheme[])('contrastes du thème %s', (scheme) => {
  const c = colors[scheme];

  it.each([
    ['text / bg', c.text, c.bg],
    ['text / surface', c.text, c.surface],
    ['text / surface2', c.text, c.surface2],
    ['textMuted / bg', c.textMuted, c.bg],
    ['textMuted / surface', c.textMuted, c.surface],
    ['brandText / bg', c.brandText, c.bg],
    ['brandText / surface', c.brandText, c.surface],
    ['onBrand / brand', c.onBrand, c.brand],
    ['goldText / surface', c.goldText, c.surface],
    ['success / successBg', c.success, c.successBg],
    ['warning / warningBg', c.warning, c.warningBg],
    ['danger / dangerBg', c.danger, c.dangerBg],
    ['danger / surface', c.danger, c.surface],
  ])('%s ≥ 4,5', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(TEXT);
  });

});

describe('contrastRatio', () => {
  it('noir sur blanc = 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });
  it('rejette une couleur invalide', () => {
    expect(() => contrastRatio('red', '#FFFFFF')).toThrow();
  });
});

describe('buildThemeCss', () => {
  const css = buildThemeCss();

  it('déclare chaque couleur sémantique dans les deux thèmes', () => {
    for (const [key, value] of Object.entries(colors.dark)) {
      const name = `--color-${key.replace(/[A-Z0-9]/g, (m) => `-${m.toLowerCase()}`)}`;
      expect(css).toContain(`${name}:${colors.light[key as keyof typeof colors.light]};`);
      expect(css).toContain(`${name}:${value};`);
    }
  });

  it('respecte le thème système sauf si l’utilisateur force le clair', () => {
    expect(css).toContain('@media (prefers-color-scheme:dark){:root:not([data-theme="light"])');
    expect(css).toContain(':root[data-theme="dark"]');
  });
});
