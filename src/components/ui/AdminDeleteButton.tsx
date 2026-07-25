import { useAdminDelete } from '@/hooks/useAdminDelete';
import Button from './Button';
import Icon from './Icon';

interface AdminDeleteButtonProps {
  tableName: string;
  itemId: number;
  onDeleted: (id: number) => void;
}

/**
 * Action de suppression posée sur une carte. Elle reste discrète tant qu'on ne
 * la survole pas, s'annonce clairement aux technologies d'assistance et montre
 * son propre état de chargement plutôt que de figer la carte entière.
 */
export default function AdminDeleteButton({
  tableName,
  itemId,
  onDeleted,
}: AdminDeleteButtonProps) {
  const { deleteItem, isAdmin, isDeleting } = useAdminDelete();

  if (!isAdmin) return null;

  async function handleDelete(event: React.MouseEvent) {
    // La carte entière est souvent cliquable : la suppression ne doit pas
    // déclencher la navigation qui l'englobe.
    event.stopPropagation();
    const success = await deleteItem(tableName, itemId);
    if (success) {
      onDeleted(itemId);
    }
  }

  return (
    <Button
      variant="on-material"
      size="sm"
      iconOnly
      loading={isDeleting}
      onClick={handleDelete}
      aria-label="Supprimer cet élément"
      className="absolute right-2 top-2 z-10 rounded-full shadow-sm hover:text-danger"
    >
      <Icon name="trash" size={16} />
    </Button>
  );
}
