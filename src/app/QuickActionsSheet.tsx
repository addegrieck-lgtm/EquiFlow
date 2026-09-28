import { BottomSheet, Icon } from '../design/components';
import { QUICK_ACTIONS } from './quickActions';

export function QuickActionsGrid({ onPick }: { onPick?: () => void }) {
  return (
    <div className="quick-grid">
      {QUICK_ACTIONS.map((a) => (
        <a key={a.id} className="quick-action" href={a.href} onClick={onPick} style={{ color: 'inherit', textDecoration: 'none' }}>
          <Icon name={a.icon} />
          <span>{a.label}</span>
        </a>
      ))}
    </div>
  );
}

export function QuickActionsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} title="Actions rapides" onClose={onClose}>
      <QuickActionsGrid onPick={onClose} />
    </BottomSheet>
  );
}
