import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import CardGlass from '@/components/ui/CardGlass';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import { themeEmoji, type CategoryKey } from '@/design/categories';
import type { Association } from '@/lib/types/contract';
import AssociationFollowButton from './AssociationFollowButton';

export type AssociationCategoryStyle = {
  /** Repère de lecture rapide, affiché à défaut de logo et dans l'étiquette. */
  emoji: string;
  /** Dégradé du bandeau et de la vignette quand aucune image n'est fournie. */
  gradient: string;
  /** Teinte des étiquettes, reprise des couleurs de contenu du design system. */
  tone: CategoryKey;
};

/**
 * Chaque nature d'association a sa couleur et son émoji. Sans cela, une grille
 * de vingt associations formerait un mur uniforme : ici, le sport, la culture
 * et l'environnement se distinguent avant même la lecture du nom.
 */
const CATEGORY_STYLES: Record<string, AssociationCategoryStyle> = {
  sport: {
    emoji: '⚽',
    gradient: 'linear-gradient(135deg, #ffa26b 0%, #ff6b4a 100%)',
    tone: 'event',
  },
  culture: {
    emoji: '🎭',
    gradient: 'linear-gradient(135deg, #c39bfb 0%, #9b5cf6 100%)',
    tone: 'project',
  },
  social_solidarity: {
    emoji: '🤗',
    gradient: 'linear-gradient(135deg, #ffc046 0%, #f08c00 100%)',
    tone: 'petition',
  },
  youth: {
    emoji: '🎓',
    gradient: 'linear-gradient(135deg, #6bb6ff 0%, #2e90fa 100%)',
    tone: 'news',
  },
  seniors: {
    emoji: '🌺',
    gradient: 'linear-gradient(135deg, #ff9fb1 0%, #e35a76 100%)',
    tone: 'event',
  },
  environment: {
    emoji: '🌿',
    gradient: 'linear-gradient(135deg, #5ce09a 0%, #16b364 100%)',
    tone: 'asso',
  },
  education: {
    emoji: '📚',
    gradient: 'linear-gradient(135deg, #7dabff 0%, #3b82f6 100%)',
    tone: 'quartier',
  },
  insertion: {
    emoji: '🧩',
    gradient: 'linear-gradient(135deg, #8adde6 0%, #0a8ba0 100%)',
    tone: 'consult',
  },
  health_wellbeing: {
    emoji: '🩺',
    gradient: 'linear-gradient(135deg, #4fd8e6 0%, #06aec4 100%)',
    tone: 'consult',
  },
  other: {
    emoji: '🤝',
    gradient: 'var(--k-cat-asso-gradient)',
    tone: 'asso',
  },
};

const DEFAULT_CATEGORY_STYLE = CATEGORY_STYLES.other;

/**
 * Teinte, dégradé et émoji d'une catégorie d'association.
 *
 * Les catégories connues ont leur identité propre ; pour tout libellé venu de
 * la base, on retombe sur l'émoji thématique générique plutôt que sur du gris.
 */
export function associationCategoryStyle(
  category?: string | null,
  categoryLabel?: string | null,
): AssociationCategoryStyle {
  const known = category ? CATEGORY_STYLES[category] : undefined;
  if (known) return known;

  return {
    ...DEFAULT_CATEGORY_STYLE,
    emoji: themeEmoji(categoryLabel, DEFAULT_CATEGORY_STYLE.emoji),
  };
}

interface AssociationCardProps {
  association: Association;
  session: Session | null;
  following: boolean;
  onOpen: (association: Association) => void;
  onFollowUpdated: (payload: { association: Association; following: boolean }) => void;
}

/**
 * Vignette d'association.
 *
 * Le bandeau porte la couverture, la pastille porte le logo : l'identité de
 * l'association arrive avant son nom, comme sur un profil.
 */
export default function AssociationCard({
  association,
  session,
  following,
  onOpen,
  onFollowUpdated,
}: AssociationCardProps) {
  const [isFollowing, setIsFollowing] = useState(following);

  useEffect(() => {
    setIsFollowing(following);
  }, [following]);

  const logoUrl = association.logo_url as string | null | undefined;
  const coverUrl = association.cover_url as string | null | undefined;
  const style = associationCategoryStyle(
    association.category as string | null | undefined,
    association.category_label,
  );
  const followers = association.followers_count || 0;

  return (
    <article className="k-card k-liquid-host k-card--interactive group flex h-full flex-col overflow-hidden p-0">
      <CardGlass />

      {/* Bandeau : la couverture si elle existe, sinon la couleur de la catégorie. */}
      <Media
        src={coverUrl}
        category="asso"
        // Le bandeau reste un aplat de couleur : l'émoji vit sur la pastille.
        emoji=""
        gradient={style.gradient}
        ratio="16 / 5"
        veil={false}
      />

      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        <span className="k-glass-thick -mt-10 block w-fit rounded-xl p-1">
          <Media
            src={logoUrl}
            alt=""
            category="asso"
            emoji={style.emoji}
            gradient={style.gradient}
            ratio="1 / 1"
            veil={false}
            rounded="var(--k-radius-md)"
            className="w-[4.25rem]"
          />
        </span>

        <div>
          {/*
            La carte entière ouvre la page : le titre porte l'action et son
            ombre s'étend à toute la surface, plutôt que de rendre une div
            cliquable.
          */}
          <h3 className="k-title-3">
            <button
              type="button"
              onClick={() => onOpen(association)}
              // `line-clamp-2` impose déjà sa boîte : y ajouter `block`
              // annulerait le rognage sur deux lignes.
              className="line-clamp-2 w-full text-balance text-left after:absolute after:inset-0 after:content-['']"
            >
              {association.name}
            </button>
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {association.category_label ? (
              <Badge tone={style.tone} emoji={style.emoji}>
                {association.category_label}
              </Badge>
            ) : null}
            {association.is_verified ? (
              <Badge tone="accent" icon="shield">
                Vérifiée
              </Badge>
            ) : null}
            {association.status && association.status !== 'active' ? (
              <Badge tone="warning" dot>
                {association.status_label}
              </Badge>
            ) : null}
          </div>
        </div>

        <p className="k-subhead k-ink-secondary line-clamp-3">
          {association.short_description as string}
        </p>

        <div className="k-footnote k-ink-tertiary flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="users" size={15} />
            <span className="tabular-nums">{followers}</span> abonné{followers > 1 ? 's' : ''}
          </span>
          {association.contact_email ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Icon name="mail" size={15} />
              <span className="truncate">{association.contact_email as string}</span>
            </span>
          ) : null}
        </div>

        {/* `relative` garde les commandes au-dessus de la zone cliquable du titre. */}
        <div className="relative mt-auto flex flex-wrap items-center gap-2 pt-3">
          <Button
            variant="tinted"
            onClick={() => onOpen(association)}
            trailing={<Icon name="chevronRight" size={16} />}
          >
            Voir la page
          </Button>

          {association.status === 'active' ? (
            <AssociationFollowButton
              associationId={association.id}
              session={session}
              initialFollowing={isFollowing}
              onUpdated={(nextFollowing) => {
                setIsFollowing(nextFollowing);
                onFollowUpdated({ association, following: nextFollowing });
              }}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}
