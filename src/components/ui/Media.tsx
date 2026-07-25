import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CATEGORIES, type CategoryKey } from '@/design/categories';
import { sanitizeStorageUrl } from '@/utils/imageUtils';

type MediaProps = {
  src?: string | null;
  /**
   * Photo de secours, utilisée quand `src` est absent ou ne charge pas. C'est
   * elle qui garde une grille photographique lorsque la donnée est incomplète.
   */
  fallbackSrc?: string | null;
  /**
   * Description de l'image. Laisse-la vide quand la photo est illustrative et
   * que le titre voisin dit déjà de quoi il s'agit : la répéter alourdit la
   * lecture au lecteur d'écran.
   */
  alt?: string;
  /** Détermine la teinte et l'émoji affichés en dernier recours. */
  category: CategoryKey;
  /** Émoji plus précis que celui de la catégorie (thème, sujet). */
  emoji?: string;
  /** Dégradé imposé, quand une grille entière relève de la même catégorie. */
  gradient?: string;
  ratio?: string;
  className?: string;
  /** Contenu posé par-dessus la photo : titre, badges, date. */
  overlay?: ReactNode;
  /** Voile sombre sous l'incrustation. Inutile si `overlay` est absent. */
  veil?: boolean;
  rounded?: string;
  loading?: 'lazy' | 'eager';
};

/**
 * Photo d'un contenu.
 *
 * La photographie est ce qui donne sa vie à une carte : elle passe donc avant
 * tout le reste, y compris via une image de secours. Le repli dessiné n'arrive
 * qu'en dernier, quand il n'y a réellement aucune image à montrer, et il reste
 * discret : une teinte douce et un petit repère, pas une bannière décorative
 * qui prendrait la place d'une photo.
 */
export default function Media({
  src,
  fallbackSrc,
  alt = '',
  category,
  emoji,
  gradient,
  ratio = '16 / 10',
  className,
  overlay,
  veil = true,
  rounded,
  loading = 'lazy',
}: MediaProps) {
  const primary = sanitizeStorageUrl(src) || null;
  const secondary = sanitizeStorageUrl(fallbackSrc) || null;

  // `null` signifie « plus aucune image à tenter ».
  const [current, setCurrent] = useState<string | null>(primary ?? secondary);

  useEffect(() => {
    setCurrent(primary ?? secondary);
  }, [primary, secondary]);

  function handleError() {
    // La photo principale échoue : on tente celle de secours avant d'abandonner.
    setCurrent((active) => (active === primary && secondary ? secondary : null));
  }

  return (
    <div
      className={['k-media', current ? '' : 'k-media--empty', className]
        .filter(Boolean)
        .join(' ')}
      style={{
        aspectRatio: ratio,
        borderRadius: rounded,
        containerType: 'inline-size',
        backgroundImage: current
          ? undefined
          : (gradient ?? `var(--k-cat-${category}-soft-fill)`),
      }}
    >
      {current ? (
        <img src={current} alt={alt} loading={loading} onError={handleError} />
      ) : (
        <span className="k-media__fallback" aria-hidden="true">
          {emoji ?? CATEGORIES[category].emoji}
        </span>
      )}

      {overlay ? (
        <>
          {veil ? <span className="k-media__veil" aria-hidden="true" /> : null}
          <div className="k-media__caption">{overlay}</div>
        </>
      ) : null}
    </div>
  );
}
