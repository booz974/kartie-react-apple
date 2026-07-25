import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Surface from '@/components/ui/Surface';
import type { Association } from '@/lib/types/contract';
import AssociationFollowButton from './AssociationFollowButton';

interface AssociationCardProps {
  association: Association;
  session: Session | null;
  following: boolean;
  onOpen: (association: Association) => void;
  onFollowUpdated: (payload: { association: Association; following: boolean }) => void;
}

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

  return (
    <Surface className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-lg border border-separator object-cover"
          />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <Icon name="handshake" size={24} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="k-title-3 truncate">{association.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {association.category_label ? <Badge>{association.category_label}</Badge> : null}
            {association.status && association.status !== 'active' ? (
              <Badge tone="warning">{association.status_label}</Badge>
            ) : null}
            {association.is_verified ? (
              <Badge tone="accent" icon="shield">
                Vérifiée
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <p className="k-subhead k-ink-secondary line-clamp-3">
        {association.short_description as string}
      </p>

      <div className="k-footnote k-ink-tertiary flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="users" size={15} />
          {association.followers_count || 0} abonné{(association.followers_count || 0) > 1 ? 's' : ''}
        </span>
        {association.contact_email ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Icon name="mail" size={15} />
            <span className="truncate">{association.contact_email as string}</span>
          </span>
        ) : null}
      </div>

      <div className="k-hairline-top mt-auto flex flex-wrap items-center gap-2 pt-4">
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
    </Surface>
  );
}
