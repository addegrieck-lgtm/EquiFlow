import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: IconName;
  block?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', icon, block, className, children, type = 'button', ...rest }: ButtonProps) {
  const cls = ['btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {icon && <Icon name={icon} size={20} />}
      <span>{children}</span>
    </button>
  );
}

/** Bouton icône seule : le libellé accessible est obligatoire. */
export function IconButton({
  icon,
  label,
  className,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { icon: IconName; label: string }) {
  return (
    <button type="button" className={['icon-btn', className].filter(Boolean).join(' ')} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={22} />
    </button>
  );
}
