import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { followAssociation, unfollowAssociation } from '@/api/associations';

interface AssociationFollowButtonProps {
  associationId: number;
  session: Session | null;
  initialFollowing: boolean;
  onUpdated: (following: boolean) => void;
  onAuthRequired?: () => void;
}

export default function AssociationFollowButton({
  associationId,
  session,
  initialFollowing,
  onUpdated,
  onAuthRequired,
}: AssociationFollowButtonProps) {
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  async function handleToggle() {
    if (!session?.user) {
      onAuthRequired?.();
      return;
    }

    setIsLoading(true);
    const userId = session.user.id;
    const action = isFollowing ? unfollowAssociation : followAssociation;
    const result = await action(associationId, userId);

    if (result.success) {
      const nextFollowing = !isFollowing;
      setIsFollowing(nextFollowing);
      onUpdated(nextFollowing);
      await queryClient.invalidateQueries({ queryKey: ['association'] });
      await queryClient.invalidateQueries({ queryKey: ['associations'] });
    } else {
      alert("Impossible de mettre à jour l'abonnement.");
    }

    setIsLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading || !session}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all',
        isFollowing
          ? 'bg-slate-900 text-white hover:bg-slate-800'
          : 'bg-white/80 text-slate-900 hover:bg-white',
        (!session || isLoading) && 'cursor-not-allowed opacity-60',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span>{isFollowing ? '✓' : '+'}</span>
      <span>{isFollowing ? 'Suivi' : 'S\u2019abonner'}</span>
    </button>
  );
}
