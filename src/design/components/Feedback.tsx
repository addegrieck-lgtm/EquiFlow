import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Button } from './Button';
import type { IconName } from './Icon';

// --- Toasts ------------------------------------------------------------------------------------

interface ToastMsg {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

let toasts: ToastMsg[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, tone: ToastMsg['tone'] = 'info'): void {
  const id = Date.now() + Math.random();
  toasts = [...toasts, { id, text, tone }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, tone === 'error' ? 6000 : 3200);
}

/** Affiche l'erreur d'une action (validation, stockage plein…) au lieu de l'ignorer. */
export function toastError(e: unknown): void {
  const msg = e instanceof Error ? e.message : String(e);
  toast(/QuotaExceeded/i.test(msg) ? 'Stockage de l’appareil plein : libérez de l’espace ou supprimez des vidéos.' : msg, 'error');
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => toasts,
  );
  return (
    <div className="toaster" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

// --- Confirmation en deux temps ----------------------------------------------------------------

/** Action destructive : premier appui = « Confirmer ? », second appui = exécution. */
export function ConfirmButton({ children, confirmLabel = 'Confirmer la suppression', onConfirm, icon = 'trash' }: { children: ReactNode; confirmLabel?: string; onConfirm: () => void; icon?: IconName }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button variant="danger" icon={icon} block onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? confirmLabel : children}
    </Button>
  );
}

// --- Graphiques -----------------------------------------------------------------------------

interface BarDatum {
  label: string;
  value: number;
  /** Texte accessible et info-bulle. */
  title: string;
  highlight?: boolean;
}

/** Histogramme vertical sobre (SVG), lisible sur mobile, avec résumé accessible. */
export function BarChart({ data, height = 140, summary }: { data: BarDatum[]; height?: number; summary: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / data.length;
  return (
    <figure className="chart" aria-label={summary}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height} role="img" aria-hidden="true">
        <line x1="0" x2="100" y1={height - 0.5} y2={height - 0.5} className="chart__axis" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 8);
          return (
            <rect
              key={i}
              x={i * w + w * 0.18}
              y={height - h}
              width={w * 0.64}
              height={Math.max(h, d.value > 0 ? 2 : 0)}
              rx="1.2"
              className={d.highlight ? 'chart__bar chart__bar--hl' : 'chart__bar'}
            >
              <title>{d.title}</title>
            </rect>
          );
        })}
      </svg>
      <div className="chart__labels" aria-hidden="true">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </figure>
  );
}

/** Barres horizontales : répartition par catégorie / discipline. */
export function HBarList({ items }: { items: { label: string; value: number; display: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="hbars">
      {items.map((i) => (
        <li key={i.label}>
          <div className="hbars__row">
            <span>{i.label}</span>
            <strong>{i.display}</strong>
          </div>
          <div className="hbars__track">
            <div className="hbars__fill" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
      <div className="progress__fill" style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} />
    </div>
  );
}
