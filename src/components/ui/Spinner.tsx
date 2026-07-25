type SpinnerProps = {
  size?: number;
  className?: string;
  /** Libellé pour un chargement bloquant. Omis, le spinner reste décoratif. */
  label?: string;
};

export default function Spinner({ size = 20, className, label }: SpinnerProps) {
  return (
    <span
      className={['k-spinner', className].filter(Boolean).join(' ')}
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(1.5, size / 10),
      }}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
