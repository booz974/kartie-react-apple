type ProgressProps = {
  value: number;
  max?: number;
  tone?: 'accent' | 'warm' | 'success';
  /** Libellé annoncé. Sans lui la barre reste un simple indicateur visuel. */
  label?: string;
  className?: string;
};

export default function Progress({
  value,
  max = 100,
  tone = 'accent',
  label,
  className,
}: ProgressProps) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.min(1, Math.max(0, value / safeMax));

  return (
    <div
      className={['k-progress', className].filter(Boolean).join(' ')}
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(value) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? safeMax : undefined}
    >
      <div
        className={['k-progress__fill', tone !== 'accent' ? `k-progress__fill--${tone}` : '']
          .filter(Boolean)
          .join(' ')}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
