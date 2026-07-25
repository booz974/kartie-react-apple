import type { ReactNode } from 'react';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import type { Association } from '@/lib/types/contract';

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
 * L'ordre de lecture est fixe : ce que c'est (logo, nom), où c'est (quartier),
 * combien de monde suit, puis l'action. La couverture reste une image, pas un
 * décor : sans elle, l'en-tête ne perd rien de sa hiérarchie.
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

  return (
    <header className="flex flex-col gap-5">
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="h-36 w-full rounded-xl border border-separator object-cover md:h-52"
        />
      ) : null}

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl border border-separator object-cover md:h-20 md:w-20"
            />
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent md:h-20 md:w-20">
              <Icon name="handshake" size={30} />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {association.category_label ? <Badge>{association.category_label}</Badge> : null}
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

            <h1 className="k-title-large mt-2 text-balance">{association.name}</h1>

            {association.short_description ? (
              <p className="k-callout k-ink-secondary k-measure mt-2">
                {association.short_description as string}
              </p>
            ) : null}

            <div className="k-footnote k-ink-tertiary mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              {quartier ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="mapPin" size={15} />
                  {quartier}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Icon name="users" size={15} />
                {followers} abonné(s)
              </span>
            </div>
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
