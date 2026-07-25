type AvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ src, name, size = 40, className }: AvatarProps) {
  const label = name?.trim() || null;

  return (
    <span
      className={['k-avatar', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      // Le nom est déjà affiché à côté dans tous les usages : l'avatar reste
      // décoratif pour éviter une annonce en double.
      aria-hidden="true"
    >
      {src ? (
        <img src={src} alt="" loading="lazy" width={size} height={size} />
      ) : (
        <span>{label ? initials(label) : '?'}</span>
      )}
    </span>
  );
}
