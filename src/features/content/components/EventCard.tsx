import { Link } from 'react-router';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import CardGlass from '@/components/ui/CardGlass';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import { surfaceClass } from '@/components/ui/Surface';
import type { AgendaEvent } from '@/lib/types/contract';

interface EventCardProps {
  event: AgendaEvent;
  onDelete: (id: number | string) => void;
}

/**
 * Vignette d'un événement.
 *
 * L'affiche passe devant : c'est elle qui donne envie d'y aller. Faute de
 * photo, le dégradé corail des événements et son émoji prennent la place, pour
 * qu'une grille d'agenda ne retombe jamais en rectangles gris.
 */
export default function EventCard({ event, onDelete }: EventCardProps) {
  const target = event.routePath || `/events/${event.id}`;

  const tableName = event.source === 'association' ? 'association_events' : 'events';
  const targetId = event.source === 'association' ? event.original_id : (event as { id: number }).id;

  const imageUrl = event.image || (event as { image_url?: string }).image_url || '';
  const location = (event as { location?: string }).location ?? '';
  const description = (event as { description?: string }).description ?? '';

  return (
    <article
      className={surfaceClass({
        interactive: true,
        className: 'k-glass--event group relative flex h-full flex-col overflow-hidden',
      })}
    >
      <CardGlass />

      <AdminDeleteButton
        tableName={tableName}
        itemId={targetId}
        onDeleted={() => onDelete(event.id)}
      />

      <Media src={imageUrl} category="event" ratio="16 / 10" />

      {/* La date se lit sur l'affiche : c'est la première question qu'on se
          pose devant un événement. */}
      {event.date ? (
        <span className="absolute left-3 top-3 z-10 max-w-[calc(100%-5rem)]">
          <Badge tone="event" emoji="📅" onMedia>
            <span className="min-w-0 truncate">{event.date}</span>
          </Badge>
        </span>
      ) : null}

      <div className="flex flex-1 flex-col gap-2 p-5">
        {event.source === 'association' ? (
          <Badge tone="asso" emoji="🤝" className="self-start">
            {event.association_name || 'Association'}
          </Badge>
        ) : null}

        <h3 className="k-title-3 text-balance">
          <Link to={target} className="after:absolute after:inset-0 after:content-['']">
            {event.title}
          </Link>
        </h3>

        {location ? (
          <p className="k-footnote k-ink-secondary flex items-center gap-1.5">
            <Icon name="mapPin" size={15} className="shrink-0 text-cat-event" />
            <span className="min-w-0 truncate">{location}</span>
          </p>
        ) : null}

        {description ? (
          <p className="k-subhead k-ink-secondary mt-1 line-clamp-3">{description}</p>
        ) : null}

        <p className="k-footnote mt-auto flex items-center gap-1 pt-3 font-semibold text-cat-event-ink">
          Voir l&apos;événement
          <Icon
            name="arrowRight"
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </p>
      </div>
    </article>
  );
}
