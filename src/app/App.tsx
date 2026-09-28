import { useEffect, useState } from 'react';
import { AgendaPage } from '../features/calendar/AgendaPage';
import { HomePage } from '../features/home/HomePage';
import { HorsePage } from '../features/horse/HorsePage';
import { SessionsPage } from '../features/sessions/SessionsPage';
import { DesignSystemPage } from '../features/settings/DesignSystemPage';
import { MorePage } from '../features/settings/MorePage';
import { Icon } from '../design/components';
import { QuickActionsSheet } from './QuickActionsSheet';
import { TabBar } from './TabBar';
import { useLocation, type Location } from './router';

function Screen({ loc }: { loc: Location }) {
  switch (loc.tab) {
    case 'home':
      return <HomePage />;
    case 'horse':
      return <HorsePage />;
    case 'sessions':
      return <SessionsPage />;
    case 'agenda':
      return <AgendaPage />;
    case 'more':
      return loc.path[0] === 'design' ? <DesignSystemPage /> : <MorePage />;
  }
}

export function App() {
  const loc = useLocation();
  const [quickOpen, setQuickOpen] = useState(false);

  // Nouvel écran : on remonte en haut et on annonce le changement aux lecteurs d'écran.
  const key = [loc.tab, ...loc.path].join('/');
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [key]);

  return (
    <>
      <main id="main" className="app" tabIndex={-1} key={key}>
        <Screen loc={loc} />
      </main>
      <button type="button" className="fab" aria-label="Actions rapides" onClick={() => setQuickOpen(true)}>
        <Icon name="plus" size={26} />
      </button>
      <TabBar current={loc.tab} />
      <QuickActionsSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
}
