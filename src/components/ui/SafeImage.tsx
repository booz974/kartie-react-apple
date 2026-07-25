import { useEffect, useState, type HTMLAttributes, type ReactNode } from 'react';
import { sanitizeStorageUrl } from '@/utils/imageUtils';
import Icon from './Icon';

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

  // Repli neutre : il occupe exactement la place de l'image, sans attirer l'œil
  // ni faire sauter la mise en page au moment du remplacement.
  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-surface-secondary text-ink-quaternary ${className ?? ''}`}
      title={alt}
      {...rest}
    >
      {fallback ?? <Icon name="image" size={24} />}
    </div>
  );
}
