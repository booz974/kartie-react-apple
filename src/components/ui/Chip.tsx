import type { ReactNode } from 'react';
import type { CategoryKey } from '@/design/categories';

type ChipTone = CategoryKey | 'accent' | 'warm' | 'neutral';

type ChipProps = {
  /** Émoji ou icône. Toujours décoratif : le libellé voisin porte le sens. */
  children: ReactNode;
  tone?: ChipTone;
  size?: number;
  className?: string;
};

/**
 * Pastille ronde colorée placée en tête de ligne ou de carte.
 *
 * Elle donne à une liste son rythme et sa couleur, là où une colonne d'icônes
 * grises rendrait toutes les entrées identiques au premier regard.
 */
export default function Chip({ children, tone = 'neutral', size = 44, className }: ChipProps) {
  return (
    <span
      className={[
        'k-chip',
        tone !== 'neutral' ? `k-chip--${tone}` : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
