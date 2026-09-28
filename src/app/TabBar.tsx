import { Icon, type IconName } from '../design/components';
import { toHash, type Tab } from './router';

const ITEMS: { tab: Tab; label: string; icon: IconName }[] = [
  { tab: 'home', label: 'Accueil', icon: 'home' },
  { tab: 'horse', label: 'Cheval', icon: 'horseshoe' },
  { tab: 'sessions', label: 'Séances', icon: 'activity' },
  { tab: 'agenda', label: 'Agenda', icon: 'calendar' },
  { tab: 'more', label: 'Plus', icon: 'menu' },
];

export function TabBar({ current }: { current?: Tab }) {
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      <ul className="tabbar__list">
        {ITEMS.map((it) => (
          <li key={it.tab}>
            <a className="tabbar__link" href={toHash(it.tab)} aria-current={it.tab === current ? 'page' : undefined}>
              <Icon name={it.icon} size={24} />
              <span>{it.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
