/**
 * Kartie — identité visuelle des natures de contenu.
 *
 * Chaque type d'information porte une couleur et un émoji. L'émoji n'est pas
 * une décoration : c'est le repère qui permet de reconnaître une pétition d'un
 * événement au premier coup d'œil, avant même d'avoir lu le titre. Les icônes
 * au trait restent réservées aux commandes de l'interface (navigation,
 * boutons, contrôles), où un pictogramme cohérent vaut mieux qu'un émoji.
 */

export type CategoryKey =
  | 'event'
  | 'news'
  | 'project'
  | 'petition'
  | 'consult'
  | 'asso'
  | 'quartier';

export type CategoryStyle = {
  /** Repère de lecture rapide. */
  emoji: string;
  label: string;
  /** Suffixe des classes `k-badge--*` et des variables `--k-cat-*`. */
  key: CategoryKey;
};

export const CATEGORIES: Record<CategoryKey, CategoryStyle> = {
  event: { key: 'event', emoji: '🎉', label: 'Événement' },
  news: { key: 'news', emoji: '📰', label: 'Actualité' },
  project: { key: 'project', emoji: '🏗️', label: 'Réalisation' },
  petition: { key: 'petition', emoji: '✍️', label: 'Pétition' },
  consult: { key: 'consult', emoji: '🗳️', label: 'Consultation' },
  asso: { key: 'asso', emoji: '🤝', label: 'Association' },
  quartier: { key: 'quartier', emoji: '📍', label: 'Quartier' },
};

/** Dégradé de repli quand un contenu n'a pas de photo. */
export function categoryGradient(key: CategoryKey): string {
  return `var(--k-cat-${key}-gradient)`;
}

/**
 * Émoji d'un thème de pétition. Les thèmes viennent de la base et sont libres :
 * on retombe sur l'émoji générique de la pétition si rien ne correspond.
 */
export function petitionThemeEmoji(theme: string | null | undefined): string {
  const value = (theme ?? '').toLowerCase();
  if (value.includes('transport') || value.includes('mobilité')) return '🚌';
  if (value.includes('sécurité') || value.includes('sécurite')) return '🛡️';
  if (value.includes('environnement') || value.includes('écologie') || value.includes('ecologie')) {
    return '🌿';
  }
  if (value.includes('logement') || value.includes('habitat')) return '🏠';
  if (value.includes('emploi') || value.includes('économie') || value.includes('economie')) {
    return '💼';
  }
  if (value.includes('culture')) return '🎭';
  if (value.includes('sport')) return '⚽';
  if (value.includes('jeunesse') || value.includes('éducation') || value.includes('education')) {
    return '🎓';
  }
  if (value.includes('santé') || value.includes('sante')) return '🩺';
  return '📣';
}

/** Émoji d'une catégorie de réalisation ou d'association. */
export function themeEmoji(label: string | null | undefined, fallback = '✨'): string {
  const value = (label ?? '').toLowerCase();
  if (!value) return fallback;
  if (value.includes('travaux') || value.includes('voirie')) return '🚧';
  if (value.includes('culture') || value.includes('patrimoine')) return '🎭';
  if (value.includes('sport')) return '⚽';
  if (value.includes('environnement') || value.includes('nature')) return '🌿';
  if (value.includes('social') || value.includes('solidarité')) return '🤗';
  if (value.includes('économie') || value.includes('economie') || value.includes('emploi')) {
    return '💼';
  }
  if (value.includes('éducation') || value.includes('education') || value.includes('jeunesse')) {
    return '🎓';
  }
  if (value.includes('santé') || value.includes('sante')) return '🩺';
  if (value.includes('mobilité') || value.includes('transport')) return '🚌';
  if (value.includes('numérique') || value.includes('numerique')) return '💻';
  if (value.includes('loisir')) return '🎪';
  return fallback;
}

/** Émoji d'un type de publication du fil de quartier. */
export const POST_TYPE_EMOJI: Record<string, string> = {
  alerte: '🚨',
  signalement: '📸',
  entraide: '🤝',
  perdu_trouve: '🔍',
  village_square: '🏘️',
  association_post: '🤝',
  association_event: '🎉',
  regular: '💬',
};
