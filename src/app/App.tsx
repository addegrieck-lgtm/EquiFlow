import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { Icon, Toaster } from '../design/components';
import { AssistantPage } from '../features/assistant/AssistantPage';
import { AgendaTab } from '../features/calendar/AgendaPage';
import { ScanPage } from '../features/documents/ScanPage';
import { HomePage } from '../features/home/HomePage';
import { HorseTab } from '../features/horse/HorsePage';
import { Onboarding } from '../features/onboarding/Onboarding';
import { SearchPage } from '../features/search/SearchPage';
import { SessionsTab } from '../features/sessions/SessionsPage';
import { MoreTab } from '../features/settings/MorePage';
import { LockScreen } from '../features/settings/SecurityPage';
import { isUnlocked, PIN_KEY } from '../services/pin';
import { QuickActionsSheet } from './QuickActionsSheet';
import { TabBar } from './TabBar';
import { TABS, useLocation, type Location, type Tab } from './router';

function Screen({ loc }: { loc: Location }) {
  switch (loc.tab) {
    case 'home':
      return <HomePage />;
    case 'horse':
      return <HorseTab path={loc.path} />;
    case 'sessions':
      return <SessionsTab path={loc.path} />;
    case 'agenda':
      return <AgendaTab path={loc.path} />;
    case 'more':
      return <MoreTab path={loc.path} />;
    case 'ai':
      return <AssistantPage />;
    case 'scan':
      return <ScanPage horseId={loc.path[0]} />;
    case 'search':
      return <SearchPage />;
  }
}

export function App() {
  const loc = useLocation();
  const [quickOpen, setQuickOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const boot = useLiveQuery(async () => ({ profile: await db.profiles.toCollection().first(), pin: await db.settings.get(PIN_KEY) }), []);

  // Nouvel écran : on remonte en haut et on annonce le changement aux lecteurs d'écran.
  const key = [loc.tab, ...loc.path].join('/');
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [key]);

  // Une fois l'espace créé, on demande au navigateur de ne pas effacer les données locales.
  useEffect(() => {
    if (boot?.profile) navigator.storage?.persist?.().catch(() => undefined);
  }, [boot?.profile]);

  if (!boot) return null;

  if (!boot.profile)
    return (
      <>
        <main id="main" className="app" tabIndex={-1} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
          <Onboarding />
        </main>
        <Toaster />
      </>
    );

  if (boot.pin && !unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

  const tab: Tab | undefined = (TABS as readonly string[]).includes(loc.tab) ? (loc.tab as Tab) : undefined;
  // Le bouton « + » n'apparaît que sur les écrans principaux : sur un formulaire ou dans
  // l'assistant, il masquerait « Enregistrer » ou « Envoyer ».
  const showFab = tab !== undefined && loc.path.length === 0;
  return (
    <>
      <main id="main" className="app" tabIndex={-1} key={key}>
        <Screen loc={loc} />
      </main>
      {showFab && (
        <button type="button" className="fab" aria-label="Actions rapides" onClick={() => setQuickOpen(true)}>
          <Icon name="plus" size={26} />
        </button>
      )}
      <TabBar current={tab} />
      <QuickActionsSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
      <Toaster />
    </>
  );
}
