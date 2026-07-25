import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import Icon from '@/components/ui/Icon';
import { getStorageUrl } from '@/utils/imageUtils';

interface QuartierCardQuartier {
  id: number;
  name: string;
  catchphrase?: string | null;
  image_filename?: string | null;
}

interface QuartierCardProps {
  quartier: QuartierCardQuartier;
  /** Format allongé pour les rangées défilantes de la page d'accueil. */
  compact?: boolean;
}

export default function QuartierCard({ quartier, compact = false }: QuartierCardProps) {
  const [imageError, setImageError] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const bucketUrl = `${supabaseUrl}/storage/v1/object/public/quartiers_images`;

  const imageUrl = useMemo(() => {
    if (!quartier.image_filename) return null;
    return getStorageUrl(bucketUrl, quartier.image_filename.trim());
  }, [bucketUrl, quartier.image_filename]);

  const description = quartier.catchphrase?.trim();
  const showImage = imageUrl && !imageError;

  return (
    <Link
      to={`/quartiers/${quartier.id}`}
      className="k-press group relative block overflow-hidden rounded-xl bg-canvas-sunken"
    >
      <div className={compact ? 'aspect-[3/2]' : 'aspect-[4/3]'}>
        {showImage ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-quaternary">
            <Icon name="mapPin" size={40} />
          </div>
        )}
      </div>

      {/*
        Le voile ne couvre que la bande où le texte se pose, et il est calé sur
        la hauteur réelle du contenu : assombrir toute l'image effacerait la
        photographie qui donne son identité au quartier.
      */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent pt-16" />

      <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-5">
        <h3 className={`${compact ? 'k-title-3' : 'k-title-2'} k-vibrant drop-shadow-sm`}>
          {quartier.name}
        </h3>
        {description ? (
          // Toujours visible : sur un écran tactile, un contenu révélé au survol
          // n'existe pas.
          <p className="k-footnote mt-1 line-clamp-2 text-white/85">{description}</p>
        ) : null}
      </div>
    </Link>
  );
}
