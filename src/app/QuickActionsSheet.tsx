import { BottomSheet, Icon } from '../design/components';
import { QUICK_ACTIONS } from './quickActions';

export function QuickActionsGrid({ onPick }: { onPick?: () => void }) {
  return (
    <div className="quick-grid">
      {QUICK_ACTIONS.map((a) => {
        const available = Boolean(a.href);
        return (
          <button
            key={a.id}
            type="button"
            className="quick-action"
            disabled={!available}
            onClick={() => {
              if (a.href) window.location.hash = a.href;
              onPick?.();
            }}
          >
            <Icon name={a.icon} />
            <span>{a.label}</span>
            {!available && <span className="muted small">{a.availableAt}</span>}
          </button>
        );
      })}
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
