import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['card', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

interface ListRowProps {
  icon?: IconName;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
}

/** Ligne de liste cliquable (lien, bouton) ou statique. */
export function ListRow({ icon, title, subtitle, trailing, onClick, href }: ListRowProps) {
  const content = (
    <>
      {icon && (
        <span className="list-row__icon">
          <Icon name={icon} size={20} />
        </span>
      )}
      <span className="list-row__text">
        <span className="list-row__title">{title}</span>
        {subtitle && <span className="list-row__subtitle">{subtitle}</span>}
      </span>
      {trailing ?? ((onClick || href) && <Icon name="chevron" size={18} className="list-row__chevron" />)}
    </>
  );
  if (href)
    return (
      <a className="list-row list-row--action" href={href}>
        {content}
      </a>
    );
  if (onClick)
    return (
      <button type="button" className="list-row list-row--action" onClick={onClick}>
        {content}
      </button>
    );
  return <div className="list-row">{content}</div>;
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile__label">{label}</span>
      <span className="stat-tile__value">{value}</span>
      {hint && <span className="stat-tile__hint">{hint}</span>}
    </div>
  );
}
