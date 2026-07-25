import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';

type NoticeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONE_ICON: Record<NoticeTone, IconName> = {
  neutral: 'info',
  info: 'info',
  success: 'checkCircle',
  warning: 'warning',
  danger: 'alert',
};

type NoticeProps = {
  children: ReactNode;
  tone?: NoticeTone;
  icon?: IconName;
  className?: string;
};

/**
 * Message contextuel posé à côté de ce qu'il concerne. C'est ce qui remplace
 * les alertes navigateur pour tout ce qui n'est ni fugace ni bloquant.
 */
export default function Notice({ children, tone = 'neutral', icon, className }: NoticeProps) {
  return (
    <div
      className={['k-notice', tone !== 'neutral' ? `k-notice--${tone}` : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      // Une erreur doit être annoncée dès son apparition ; le reste attend son tour.
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon name={icon ?? TONE_ICON[tone]} size={17} className="k-notice__icon" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
