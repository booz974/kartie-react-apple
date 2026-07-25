import { useState } from 'react';
import type { ReactNode } from 'react';
import { CATEGORIES, type CategoryKey } from '@/design/categories';

type MediaProps = {
  src?: string | null;
  /**
   * Description de l'image. Laisse-la vide quand la photo est illustrative et
   * que le titre voisin dit déjà de quoi il s'agit : la répéter alourdit la
   * lecture au lecteur d'écran.
   */
  alt?: string;
  /** Détermine le dégradé et l'émoji affichés à défaut de photo. */
  category: CategoryKey;
  /** Émoji de repli plus précis que celui de la catégorie (thème, sujet). */
  emoji?: string;
  /**
   * Dégradé de repli imposé. Utile quand une grille entière relève de la même
   * catégorie : sans variation, douze vignettes sans photo formeraient un mur
   * d'une seule couleur.
   */
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
 * Photo d'un contenu, avec un repli qui reste vivant.
 *
 * Une grille dont la moitié des vignettes seraient des rectangles gris perdrait
 * tout son entrain : le repli reprend la couleur du type de contenu et son
 * émoji.
 */
export default function Media({
  src,
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
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={['k-media', className].filter(Boolean).join(' ')}
      style={{
        aspectRatio: ratio,
        borderRadius: rounded,
        // Permet à la taille de l'émoji de repli de suivre celle de la vignette.
        containerType: 'inline-size',
        backgroundImage: showImage ? undefined : (gradient ?? `var(--k-cat-${category}-gradient)`),
      }}
    >
      {showImage ? (
        <img src={src as string} alt={alt} loading={loading} onError={() => setFailed(true)} />
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
