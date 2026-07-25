import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';

type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'warm'
  | 'success'
  | 'warning'
  | 'danger'
  | 'solid'
  | 'outline';

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: IconName;
  /** Pastille pleine — pour un état plutôt qu'une catégorie. */
  dot?: boolean;
  /** Fait battre la pastille : réservé à ce qui est réellement en cours. */
  live?: boolean;
  pill?: boolean;
  className?: string;
};

export default function Badge({
  children,
  tone = 'neutral',
  icon,
  dot,
  live,
  pill,
  className,
}: BadgeProps) {
  return (
    <span
      className={[
        'k-badge',
        tone !== 'neutral' ? `k-badge--${tone}` : '',
        pill ? 'k-badge--pill' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot ? <span className={`k-badge__dot${live ? ' k-badge__dot--live' : ''}`} /> : null}
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}
