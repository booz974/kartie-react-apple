import { useEffect, useState, type HTMLAttributes, type ReactNode } from 'react';
import { sanitizeStorageUrl } from '@/utils/imageUtils';

interface SafeImageProps extends HTMLAttributes<HTMLImageElement | HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: ReactNode;
}

export default function SafeImage({
  src = null,
  alt = 'Image',
  fallback,
  className,
  ...rest
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const sanitizedSrc = sanitizeStorageUrl(src);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!hasError && sanitizedSrc) {
    return (
      <img
        src={sanitizedSrc}
        alt={alt}
        className={className}
        onError={() => setHasError(true)}
        {...rest}
      />
    );
  }

  // Repli vivant : il occupe exactement la place de l'image, sans faire sauter
  // la mise en page, mais il porte la couleur du produit plutôt qu'un aplat gris.
  return (
    <div
      className={`flex items-center justify-center overflow-hidden text-2xl leading-none ${className ?? ''}`}
      style={{ backgroundImage: 'var(--k-accent-gradient)' }}
      title={alt}
      {...rest}
    >
      {fallback ?? (
        <span aria-hidden="true" className="drop-shadow">
          🖼️
        </span>
      )}
    </div>
  );
}
