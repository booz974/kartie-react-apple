import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import Media from '@/components/ui/Media';
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
 * Repli quand la photo manque. Chaque quartier reçoit son émoji et son dégradé,
 * dérivés de son identifiant : le repère reste stable dans le temps, et une
 * grille de quartiers sans photo garde de la variété au lieu de former un aplat.
 */
const FALLBACKS = [
  { emoji: '🏝️', gradient: 'linear-gradient(135deg, #4fd8e6 0%, #06aec4 100%)' },
  { emoji: '🌺', gradient: 'linear-gradient(135deg, #ff9fb1 0%, #e35a76 100%)' },
  { emoji: '🏞️', gradient: 'linear-gradient(135deg, #5ce09a 0%, #16b364 100%)' },
  { emoji: '🌊', gradient: 'linear-gradient(135deg, #7dabff 0%, #3b82f6 100%)' },
  { emoji: '⛰️', gradient: 'linear-gradient(135deg, #c39bfb 0%, #9b5cf6 100%)' },
  { emoji: '🌴', gradient: 'linear-gradient(135deg, #ffc046 0%, #f08c00 100%)' },
  { emoji: '🏘️', gradient: 'linear-gradient(135deg, #ffa26b 0%, #ff6b4a 100%)' },
  { emoji: '🌋', gradient: 'linear-gradient(135deg, #8adde6 0%, #0a8ba0 100%)' },
];

export default function QuartierCard({ quartier, compact = false }: QuartierCardProps) {
  const [failed, setFailed] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const bucketUrl = `${supabaseUrl}/storage/v1/object/public/quartiers_images`;

  const imageUrl = useMemo(() => {
    if (!quartier.image_filename) return null;
    return getStorageUrl(bucketUrl, quartier.image_filename.trim());
  }, [bucketUrl, quartier.image_filename]);

  const description = quartier.catchphrase?.trim();
  const fallback = FALLBACKS[quartier.id % FALLBACKS.length];

  return (
    <Link
      to={`/quartiers/${quartier.id}`}
      className="k-card k-card--interactive group overflow-hidden p-0"
      onErrorCapture={() => setFailed(true)}
    >
      <Media
        src={failed ? null : imageUrl}
        category="quartier"
        emoji={fallback.emoji}
        gradient={fallback.gradient}
        ratio={compact ? '3 / 2' : '4 / 3'}
        overlay={
          <>
            <h3 className={`${compact ? 'k-title-3' : 'k-title-2'} k-vibrant drop-shadow`}>
              {quartier.name}
            </h3>
            {description ? (
              // Toujours visible : sur un écran tactile, un contenu révélé au
              // survol n'existe pas.
              <p className="k-footnote mt-1 line-clamp-2 text-white/90">{description}</p>
            ) : null}
          </>
        }
      />
    </Link>
  );
}
