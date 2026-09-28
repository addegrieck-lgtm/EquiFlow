import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand' | 'gold';

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

/** Statut d'une échéance (vaccin, maréchal…) : à jour / bientôt / en retard. */
export type DueStatus = 'ok' | 'soon' | 'overdue';

const DUE: Record<DueStatus, { tone: BadgeTone; label: string }> = {
  ok: { tone: 'success', label: 'À jour' },
  soon: { tone: 'warning', label: 'Bientôt' },
  overdue: { tone: 'danger', label: 'En retard' },
};

export function DueBadge({ status }: { status: DueStatus }) {
  return <Badge tone={DUE[status].tone}>{DUE[status].label}</Badge>;
}

interface ChipProps {
  selected?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}

/** Puce sélectionnable (objectifs, filtres). */
export function Chip({ selected = false, onToggle, children }: ChipProps) {
  return (
    <button type="button" className="chip" aria-pressed={selected} onClick={onToggle}>
      {children}
    </button>
  );
}
