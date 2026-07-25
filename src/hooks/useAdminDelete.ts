import { useCallback, useState } from 'react';
import { adminSoftDelete } from '@/api/admin';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/authStore';

/**
 * Suppression administrateur d'un élément.
 *
 * La confirmation et le compte rendu passent par le design system : une boîte
 * de dialogue native sortait du produit, bloquait le fil d'exécution et
 * n'offrait aucune issue de rattrapage.
 */
export function useAdminDelete() {
  const profile = useAuthStore((state) => state.profile);
  const [isDeleting, setIsDeleting] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const isAdmin = profile?.role === 'admin';

  const deleteItem = useCallback(
    async (tableName: string, itemId: number): Promise<boolean> => {
      if (!isAdmin) {
        console.warn("Tentative de suppression sans droits d'administrateur.");
        return false;
      }

      // Suppression irréversible : c'est l'un des rares cas qui justifie une
      // confirmation, et son libellé nomme l'action plutôt que « OK ».
      const confirmed = await confirm({
        title: 'Supprimer cet élément ?',
        message: 'Il disparaîtra de la plateforme. Cette action est définitive.',
        confirmLabel: 'Supprimer',
        tone: 'danger',
      });

      if (!confirmed) {
        return false;
      }

      setIsDeleting(true);
      try {
        await adminSoftDelete(tableName, itemId);
        toast.success('Élément supprimé');
        return true;
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        toast.error(
          'Suppression impossible',
          err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.',
        );
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [confirm, isAdmin, toast],
  );

  return {
    deleteItem,
    isAdmin,
    isDeleting,
  };
}
