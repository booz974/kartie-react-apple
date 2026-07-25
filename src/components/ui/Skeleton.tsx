type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
};

/**
 * Réserve la place du contenu à venir. Toujours calquer la forme sur ce qui
 * arrivera vraiment : un gabarit qui ne correspond pas produit un saut de mise
 * en page au moment du remplacement.
 */
export default function Skeleton({ width, height = '1rem', radius, className }: SkeletonProps) {
  return (
    <div
      className={['k-skeleton', className].filter(Boolean).join(' ')}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={['flex flex-col gap-2', className].filter(Boolean).join(' ')} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          height="0.75rem"
          // La dernière ligne est plus courte, comme un paragraphe réel.
          width={index === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}
