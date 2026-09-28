import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  /** Lien de retour (hash) pour les sous-pages. */
  backHref?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, backHref, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      {backHref && (
        <a className="page-header__back" href={backHref} aria-label="Retour">
          <Icon name="back" size={22} />
        </a>
      )}
      <div className="page-header__titles">
        {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
        <h1 className="page-header__title">{title}</h1>
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      {(title || action) && (
        <div className="section__head">
          {title && <h2 className="section__title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={28} />
      </span>
      <h3 className="empty__title">{title}</h3>
      {children && <p className="empty__text">{children}</p>}
      {action}
    </div>
  );
}

/**
 * Indique honnêtement qu'un module n'est pas encore construit, et à quelle étape
 * de la roadmap (docs/SPEC.md, section O) il arrive.
 */
export function ComingSoon({ icon, title, step, children }: { icon: IconName; title: string; step: string; children: ReactNode }) {
  return (
    <EmptyState icon={icon} title={title}>
      {children}
      <span className="empty__step">En construction · {step}</span>
    </EmptyState>
  );
}
