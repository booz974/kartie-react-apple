import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
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

  return (
    <div className="desktop-glass-card rounded-3xl p-5 transition-all hover:-translate-y-1 hover:shadow-xl md:p-6">
      <div className="flex items-start gap-4">
        {association.logo_url ? (
          <img
            src={association.logo_url as string}
            alt={association.name}
            className="h-16 w-16 rounded-2xl object-cover shadow-md"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 text-2xl shadow-md">
            🤝
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-black text-slate-900">{association.name}</h3>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
              {association.category_label}
            </span>
            {association.status && association.status !== 'active' ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                {association.status_label}
              </span>
            ) : null}
            {association.is_verified ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                Vérifiée
              </span>
            ) : null}
          </div>

          <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-slate-700">
            {association.short_description as string}
          </p>

          <div className="mb-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
            <span>{association.followers_count || 0} abonné(s)</span>
            {association.contact_email ? <span>{association.contact_email as string}</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpen(association)}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Voir la page
        </button>

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
  );
}
