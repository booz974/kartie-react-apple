import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Spinner from './Spinner';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tinted'
  | 'ghost'
  | 'plain'
  | 'danger'
  | 'danger-tinted'
  | 'warm'
  | 'on-material';

export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  iconOnly?: boolean;
  className?: string;
};

/**
 * Classes du bouton, exposées séparément pour que les `<Link>` de React Router
 * portent exactement la même apparence sans dupliquer les règles ni perdre la
 * sémantique du lien.
 */
export function buttonClass({
  variant = 'secondary',
  size = 'md',
  block,
  iconOnly,
  className,
}: ButtonStyleOptions = {}): string {
  return [
    'k-btn',
    `k-btn--${variant}`,
    size !== 'md' ? `k-btn--${size}` : '',
    block ? 'k-btn--block' : '',
    iconOnly ? 'k-btn--icon' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleOptions & {
    loading?: boolean;
    /** Élément placé avant le libellé — une icône dans la quasi-totalité des cas. */
    leading?: ReactNode;
    trailing?: ReactNode;
  };

export default function Button({
  variant = 'secondary',
  size = 'md',
  block,
  iconOnly,
  className,
  loading = false,
  leading,
  trailing,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({
        variant,
        size,
        block,
        iconOnly,
        className: [loading ? 'k-btn--loading' : '', className ?? ''].filter(Boolean).join(' '),
      })}
      disabled={disabled || loading}
      // Un bouton en cours de traitement doit l'annoncer, pas seulement le montrer.
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="k-btn__spinner">
          <Spinner size={size === 'lg' ? 20 : 16} />
        </span>
      ) : null}
      <span className="k-btn__content contents">
        {leading}
        {children}
        {trailing}
      </span>
    </button>
  );
}
