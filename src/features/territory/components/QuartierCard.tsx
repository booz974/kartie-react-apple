import { useMemo } from 'react';
import { Link } from 'react-router';
import Media from '@/components/ui/Media';
import CardGlass from '@/components/ui/CardGlass';
import { getStorageUrl } from '@/utils/imageUtils';

interface QuartierCardQuartier {
  id: number;
  name: string;
  catchphrase?: string | null;
  image_filename?: string | null;
}

interface QuartierCardProps {
  quartier: QuartierCardQuartier;
  /** Format allongé pour les rangées défilantes. */
  compact?: boolean;
}

/**
 * Photo de secours d'un quartier, héritée de la version d'origine.
 *
 * Une grille de quartiers est d'abord une grille de photos : quand la fiche
 * n'en porte pas encore, mieux vaut une vue générique de l'île qu'un aplat
 * coloré, qui ferait retomber la page à plat.
 */
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';

export default function QuartierCard({ quartier, compact = false }: QuartierCardProps) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const bucketUrl = `${supabaseUrl}/storage/v1/object/public/quartiers_images`;

  const imageUrl = useMemo(() => {
    if (!quartier.image_filename) return null;
    return getStorageUrl(bucketUrl, quartier.image_filename.trim());
  }, [bucketUrl, quartier.image_filename]);

  const description = quartier.catchphrase?.trim();

  return (
    <Link
      to={`/quartiers/${quartier.id}`}
      className="k-card k-liquid-host k-card--interactive k-glass--quartier group overflow-hidden p-0"
    >
      <CardGlass />

      <Media
        src={imageUrl}
        fallbackSrc={FALLBACK_IMAGE}
        category="quartier"
        ratio={compact ? '3 / 2' : '4 / 3'}
        overlay={
          <>
            <h3 className={`${compact ? 'k-title-3' : 'k-title-2'} k-vibrant drop-shadow`}>
              {quartier.name}
            </h3>
            {description ? (
              // Toujours visible : sur un écran tactile, un contenu révélé au
              // survol n'existe pas.
              <p className="k-footnote mt-1 line-clamp-2 opacity-90">{description}</p>
            ) : null}
          </>
        }
      />
    </Link>
  );
}
