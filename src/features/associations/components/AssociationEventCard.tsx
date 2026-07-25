import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Surface from '@/components/ui/Surface';
import type { AssociationEvent } from '@/lib/types/contract';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  cancelled: 'Annulé',
  archived: 'Archivé',
  removed: 'Retiré',
};

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

const STATUS_TONES: Record<string, StatusTone> = {
  draft: 'warning',
  published: 'success',
  cancelled: 'danger',
  archived: 'neutral',
  removed: 'danger',
};

/** Libellé lisible d'un statut d'événement — la donnée reste inchangée. */
export function eventStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function eventStatusTone(status: string): StatusTone {
  return STATUS_TONES[status] || 'neutral';
}

interface AssociationEventCardProps {
  event: AssociationEvent;
  canEdit?: boolean;
  onOpen: (event: AssociationEvent) => void;
  onEdit?: (event: AssociationEvent) => void;
}

export default function AssociationEventCard({
  event,
  canEdit = false,
  onOpen,
  onEdit,
}: AssociationEventCardProps) {
  return (
    <Surface className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="k-eyebrow text-accent">{event.display_date}</p>
          <h3 className="k-title-3 mt-1 text-balance">{event.title}</h3>
        </div>
        <Badge tone={eventStatusTone(event.status)}>{eventStatusLabel(event.status)}</Badge>
      </div>

      <p className="k-subhead k-ink-secondary line-clamp-3">{event.description as string}</p>

      <div className="k-footnote k-ink-tertiary flex flex-col gap-1.5">
        {event.location ? (
          <span className="inline-flex items-start gap-1.5">
            <Icon name="mapPin" size={15} className="mt-0.5" />
            <span className="min-w-0 break-words">{event.location}</span>
          </span>
        ) : null}
        {event.external_url ? (
          <a
            href={event.external_url as string}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 font-medium text-accent hover:underline"
          >
            <Icon name="externalLink" size={15} />
            Lien externe
          </a>
        ) : null}
      </div>

      <div className="k-hairline-top mt-auto flex flex-wrap items-center gap-2 pt-4">
        <Button
          variant="tinted"
          onClick={() => onOpen(event)}
          trailing={<Icon name="chevronRight" size={16} />}
        >
          Voir le détail
        </Button>
        {canEdit && onEdit ? (
          <Button variant="ghost" onClick={() => onEdit(event)} leading={<Icon name="pencil" size={16} />}>
            Modifier
          </Button>
        ) : null}
      </div>
    </Surface>
  );
}
