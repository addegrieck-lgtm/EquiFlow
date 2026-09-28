import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import './design/global.css';
import './design/screens.css';
import { App } from './app/App';
import { applyTheme, injectThemeCss, watchSystemTheme } from './design/theme';

injectThemeCss();
applyTheme();
watchSystemTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker (hors ligne) — uniquement en production pour ne pas gêner le développement.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker non enregistré', e));
  });
}
