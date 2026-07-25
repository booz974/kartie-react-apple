import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { followAssociation, unfollowAssociation } from '@/api/associations';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

interface AssociationFollowButtonProps {
  associationId: number;
  session: Session | null;
  initialFollowing: boolean;
  onUpdated: (following: boolean) => void;
  onAuthRequired?: () => void;
}

/**
 * Bascule d'abonnement.
 *
 * L'état n'est pas seulement peint : `aria-pressed` l'expose, et le libellé
 * change avec lui pour que la bascule reste lisible sans la couleur.
 */
export default function AssociationFollowButton({
  associationId,
  session,
  initialFollowing,
  onUpdated,
  onAuthRequired,
}: AssociationFollowButtonProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
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
      toast.error(
        "Impossible de mettre à jour l'abonnement.",
        'Vérifiez votre connexion, puis réessayez.',
      );
    }

    setIsLoading(false);
  }

  return (
    <Button
      variant={isFollowing ? 'secondary' : 'primary'}
      loading={isLoading}
      disabled={!session}
      aria-pressed={isFollowing}
      onClick={() => void handleToggle()}
      leading={<Icon name={isFollowing ? 'check' : 'plus'} size={17} />}
    >
      {isFollowing ? 'Suivi' : 'S’abonner'}
    </Button>
  );
}
