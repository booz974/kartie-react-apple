import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';

type EmptyStateProps = {
  icon?: IconName;
  title: string;
  /** Dit quoi faire ensuite. Un état vide sans issue est une impasse. */
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({
  icon = 'sparkles',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={['k-empty', className].filter(Boolean).join(' ')}>
      <span className="k-empty__icon">
        <Icon name={icon} size={24} />
      </span>
      <p className="k-title-3">{title}</p>
      {description ? <p className="k-subhead k-ink-secondary k-measure">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
