import type { HTMLAttributes, ReactNode } from 'react';
import CardGlass from './CardGlass';

type SurfaceVariant = 'default' | 'flat' | 'raised' | 'sunken';

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SurfaceVariant;
  /** Rembourrage interne standard. Désactive-le pour coller une image au bord. */
  padded?: boolean;
  interactive?: boolean;
  children?: ReactNode;
};

export function surfaceClass({
  variant = 'default',
  interactive,
  className,
}: {
  variant?: SurfaceVariant;
  interactive?: boolean;
  className?: string;
} = {}): string {
  return [
    'k-card',
    // Hôte du verre liquide. Inoffensif à lui seul : le CSS ne prend la main
    // sur le fond que si une couche `<CardGlass>` est réellement posée dessous.
    'k-liquid-host',
    variant !== 'default' ? `k-card--${variant}` : '',
    interactive ? 'k-card--interactive' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Surface élevée. À n'utiliser que lorsqu'un bloc doit vraiment se détacher du
 * canevas — l'espacement et un filet suffisent la plupart du temps, et
 * multiplier les cartes rend une page moins lisible, pas plus.
 */
export default function Surface({
  variant = 'default',
  padded = true,
  interactive,
  className,
  children,
  ...rest
}: SurfaceProps) {
  return (
    <div
      className={surfaceClass({
        variant,
        interactive,
        className: [padded ? 'p-5' : '', className ?? ''].filter(Boolean).join(' '),
      })}
      {...rest}
    >
      <CardGlass />
      {children}
    </div>
  );
}
