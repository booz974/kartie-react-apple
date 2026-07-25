import type { ReactNode } from 'react';
import Badge from '@/components/ui/Badge';
import Media from '@/components/ui/Media';
import type { Association } from '@/lib/types/contract';
import { associationCategoryStyle } from './AssociationCard';

interface AssociationHeaderProps {
  association: Association;
  actions?: ReactNode;
  /** Quartier de rattachement, quand la vue le connaît déjà. */
  quartierName?: string | null;
  /** Compteur d'abonnés, si la vue en suit une version optimiste. */
  followersCount?: number;
}

/**
 * En-tête d'identité d'une association.
 *
 * L'ordre de lecture reste fixe : ce que c'est (couverture, logo, nom), où
 * c'est (quartier), combien de monde suit, puis l'action. La couverture occupe
 * toute la largeur ; sans elle, le dégradé de la catégorie tient le rôle et
 * l'en-tête ne perd ni sa couleur ni sa hiérarchie.
 */
export default function AssociationHeader({
  association,
  actions,
  quartierName,
  followersCount,
}: AssociationHeaderProps) {
  const coverUrl = association.cover_url as string | null | undefined;
  const logoUrl = association.logo_url as string | null | undefined;
  const quartier = quartierName ?? (association.quartier?.name as string | undefined);
  const followers = followersCount ?? association.followers_count ?? 0;
  const style = associationCategoryStyle(
    association.category as string | null | undefined,
    association.category_label,
  );

  return (
    <header className="flex flex-col">
      <Media
        src={coverUrl}
        category="asso"
        emoji={style.emoji}
        gradient={style.gradient}
        ratio="16 / 6"
        rounded="var(--k-radius-2xl)"
        veil={false}
        loading="eager"
      />

      <div className="flex flex-col gap-6 px-1 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          <span className="k-glass-thick -mt-12 block w-fit rounded-2xl p-1.5 md:-mt-14">
            <Media
              src={logoUrl}
              alt=""
              category="asso"
              emoji={style.emoji}
              gradient={style.gradient}
              ratio="1 / 1"
              veil={false}
              rounded="var(--k-radius-xl)"
              loading="eager"
              className="w-[5.5rem] md:w-24"
            />
          </span>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {association.category_label ? (
              <Badge tone={style.tone} emoji={style.emoji}>
                {association.category_label}
              </Badge>
            ) : null}
            {association.status_label ? (
              <Badge tone={association.is_publicly_visible ? 'success' : 'warning'} dot>
                {association.status_label}
              </Badge>
            ) : null}
            {association.is_verified ? (
              <Badge tone="accent" icon="shield">
                Vérifiée
              </Badge>
            ) : null}
          </div>

          <h1 className="k-title-large mt-3 text-balance">{association.name}</h1>

          {association.short_description ? (
            <p className="k-callout k-ink-secondary k-measure mt-3">
              {association.short_description as string}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {quartier ? (
              <Badge tone="quartier" emoji="📍">
                {quartier}
              </Badge>
            ) : null}
            <Badge tone="asso" emoji="👥">
              <span className="tabular-nums">{followers}</span>&nbsp;abonné
              {followers > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
