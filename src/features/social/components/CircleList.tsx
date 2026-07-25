import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import type { Circle } from '@/lib/types/contract';

interface CircleListProps {
  circles: Circle[];
  onCreateCircle?: () => void;
  onJoinCircle?: (circle: Circle) => void;
  onOpenCircle?: (circle: Circle) => void;
}

function isPublic(circle: Circle): boolean {
  return String(circle.type) === 'public';
}

export default function CircleList({
  circles,
  onCreateCircle,
  onJoinCircle,
  onOpenCircle,
}: CircleListProps) {
  const confirm = useConfirm();

  async function handleActivate(circle: Circle) {
    if (circle.is_member) {
      onOpenCircle?.(circle);
      return;
    }

    const accepted = await confirm({
      title: `Rejoindre « ${circle.name} » ?`,
      message: 'Vous verrez les publications du cercle et pourrez y participer.',
      confirmLabel: 'Rejoindre',
    });
    if (accepted) {
      onJoinCircle?.(circle);
    }
  }

  if (circles.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="Aucun cercle pour le moment"
        description="Un cercle réunit les voisins autour d’un sujet : jardinage, covoiturage, entraide."
        action={
          <Button variant="primary" leading={<Icon name="plus" size={17} />} onClick={() => onCreateCircle?.()}>
            Créer le premier cercle
          </Button>
        }
      />
    );
  }

  return (
    <ul className="k-list">
      {circles.map((circle) => {
        const description = String(circle.description ?? '');

        return (
          <li key={circle.id} className="flex items-start gap-4 py-4">
            <button
              type="button"
              onClick={() => void handleActivate(circle)}
              className="k-press min-w-0 flex-1 text-left"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="k-callout k-ink font-semibold">{circle.name}</span>
                <Badge tone={isPublic(circle) ? 'accent' : 'neutral'}>
                  {isPublic(circle) ? 'Public' : 'Privé'}
                </Badge>
              </span>

              {description ? (
                <span className="k-subhead k-ink-secondary mt-1 line-clamp-2 block">
                  {description}
                </span>
              ) : null}

              <span className="k-footnote k-ink-tertiary mt-1.5 flex items-center gap-1.5">
                <Icon name="users" size={15} />
                {circle.member_count !== undefined ? circle.member_count : '?'} membres
              </span>
            </button>

            <div className="shrink-0 pt-0.5">
              {circle.is_member ? (
                <Badge tone="success" icon="check">
                  Membre
                </Badge>
              ) : (
                <Button size="sm" variant="tinted" onClick={() => onJoinCircle?.(circle)}>
                  Rejoindre
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
