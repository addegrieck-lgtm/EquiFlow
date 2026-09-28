import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Politique de sécurité du contenu : aucune ressource externe, aucun script inline.
// Injectée seulement au build (le serveur de dev Vite a besoin d'un script inline).
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "script-src 'self'",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'equiflow-csp',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }],
  };
}

// base './' : l'app fonctionne depuis n'importe quel sous-dossier (GitHub Pages, serveur local…)
export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version ?? 'dev'),
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
