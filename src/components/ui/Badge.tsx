import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';
import type { CategoryKey } from '@/design/categories';

type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'warm'
  | 'success'
  | 'warning'
  | 'danger'
  | 'solid'
  | 'outline'
  | CategoryKey;

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  /** Repère de lecture rapide, placé avant le libellé. */
  emoji?: string;
  icon?: IconName;
  /** Pastille pleine — pour un état plutôt qu'une catégorie. */
  dot?: boolean;
  /** Fait battre la pastille : réservé à ce qui est réellement en cours. */
  live?: boolean;
  /** Matière propre, pour une étiquette posée par-dessus une photo. */
  onMedia?: boolean;
  size?: 'md' | 'lg';
  className?: string;
};

export default function Badge({
  children,
  tone = 'neutral',
  emoji,
  icon,
  dot,
  live,
  onMedia,
  size = 'md',
  className,
}: BadgeProps) {
  return (
    <span
      className={[
        'k-badge',
        tone !== 'neutral' ? `k-badge--${tone}` : '',
        onMedia ? 'k-badge--on-media' : '',
        size === 'lg' ? 'k-badge--lg' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot ? <span className={`k-badge__dot${live ? ' k-badge__dot--live' : ''}`} /> : null}
      {emoji ? (
        <span aria-hidden="true" className="text-[0.95em] leading-none">
          {emoji}
        </span>
      ) : null}
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}
