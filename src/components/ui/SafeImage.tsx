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

  return (
    <div
      className={`flex items-center justify-center bg-slate-200 text-slate-400 overflow-hidden ${className ?? ''}`}
      title={alt}
      {...rest}
    >
      {fallback ?? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-50"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      )}
    </div>
  );
}
