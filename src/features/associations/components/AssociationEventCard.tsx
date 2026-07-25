import Badge from '@/components/ui/Badge';
import CardGlass from '@/components/ui/CardGlass';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import type { AssociationEvent } from '@/lib/types/contract';
import { associationCategoryStyle } from './AssociationCard';

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

/** Libellé lisible d'un statut d'événement. La donnée, elle, reste inchangée. */
export function eventStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function eventStatusTone(status: string): StatusTone {
  return STATUS_TONES[status] || 'neutral';
}

/**
 * Émoji et dégradé d'un événement d'association. Un événement sans catégorie
 * garde la couleur de sa nature de contenu : le rouge orangé des événements.
 */
export function associationEventStyle(category: unknown): { emoji: string; gradient?: string } {
  const value = typeof category === 'string' ? category : '';
  if (!value || value === 'other') return { emoji: '🎉' };

  const style = associationCategoryStyle(value);
  return { emoji: style.emoji, gradient: style.gradient };
}

interface AssociationEventCardProps {
  event: AssociationEvent;
  canEdit?: boolean;
  onOpen: (event: AssociationEvent) => void;
  onEdit?: (event: AssociationEvent) => void;
}

/**
 * Vignette d'événement.
 *
 * La photo porte l'annonce, la date et le statut se lisent par-dessus : c'est
 * l'image qui donne envie de cliquer, pas la ligne de texte.
 */
export default function AssociationEventCard({
  event,
  canEdit = false,
  onOpen,
  onEdit,
}: AssociationEventCardProps) {
  const { emoji, gradient } = associationEventStyle(event.category);

  return (
    <article className="k-card k-liquid-host k-card--interactive group flex h-full flex-col overflow-hidden p-0">
      <CardGlass />

      <Media
        src={event.image_url}
        category="event"
        emoji={emoji}
        gradient={gradient}
        ratio="16 / 9"
        overlay={
          <div className="flex flex-wrap items-center gap-2">
            {event.display_date ? (
              <Badge onMedia emoji="🗓️">
                {event.display_date}
              </Badge>
            ) : null}
            <Badge onMedia tone={eventStatusTone(event.status)} dot>
              {eventStatusLabel(event.status)}
            </Badge>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/*
          La carte entière ouvre le détail : le titre porte l'action et son
          ombre s'étend à toute la surface, plutôt que de rendre une div
          cliquable.
        */}
        <h3 className="k-title-3">
          <button
            type="button"
            onClick={() => onOpen(event)}
            className="block text-balance text-left after:absolute after:inset-0 after:content-['']"
          >
            {event.title}
          </button>
        </h3>

        <p className="k-subhead k-ink-secondary line-clamp-3">{event.description as string}</p>

        <div className="k-footnote k-ink-tertiary relative flex flex-col gap-1.5">
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
              className="text-accent-ink inline-flex w-fit items-center gap-1.5 font-medium hover:underline"
            >
              <Icon name="externalLink" size={15} />
              Lien externe
            </a>
          ) : null}
        </div>

        {/* `relative` garde les commandes au-dessus de la zone cliquable du titre. */}
        <div className="relative mt-auto flex flex-wrap items-center gap-2 pt-3">
          <Button
            variant="tinted"
            onClick={() => onOpen(event)}
            trailing={<Icon name="chevronRight" size={16} />}
          >
            Voir le détail
          </Button>
          {canEdit && onEdit ? (
            <Button
              variant="ghost"
              onClick={() => onEdit(event)}
              leading={<Icon name="pencil" size={16} />}
            >
              Modifier
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
