import { useCallback, useState } from 'react';
import { adminSoftDelete } from '@/api/admin';
import { useAuthStore } from '@/stores/authStore';

export function useAdminDelete() {
  const profile = useAuthStore((state) => state.profile);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const deleteItem = useCallback(
    async (tableName: string, itemId: number): Promise<boolean> => {
      if (!isAdmin) {
        console.warn("Tentative de suppression sans droits d'administrateur.");
        return false;
      }

      if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
        return false;
      }

      setIsDeleting(true);
      try {
        await adminSoftDelete(tableName, itemId);
        return true;
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        alert('Une erreur est survenue lors de la suppression.');
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [isAdmin],
  );

  return {
    deleteItem,
    isAdmin,
    isDeleting,
  };
}
