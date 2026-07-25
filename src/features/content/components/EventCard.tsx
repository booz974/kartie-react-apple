import { Link } from 'react-router';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import { surfaceClass } from '@/components/ui/Surface';
import type { AgendaEvent } from '@/lib/types/contract';

interface EventCardProps {
  event: AgendaEvent;
  onDelete: (id: number | string) => void;
}

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
        className: 'relative flex h-full flex-col overflow-hidden',
      })}
    >
      <AdminDeleteButton
        tableName={tableName}
        itemId={targetId}
        onDeleted={() => onDelete(event.id)}
      />

      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full bg-canvas-sunken object-cover"
        />
      ) : (
        <div
          className="grid aspect-[16/9] w-full place-items-center bg-canvas-sunken text-ink-quaternary"
          aria-hidden="true"
        >
          <Icon name="calendar" size={26} />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-5">
        {event.source === 'association' ? (
          <Badge tone="accent" icon="users" className="self-start">
            {event.association_name || 'Association'}
          </Badge>
        ) : null}

        <h3 className="k-title-3 text-balance">
          <Link to={target} className="after:absolute after:inset-0 after:content-['']">
            {event.title}
          </Link>
        </h3>

        {event.date ? (
          <p className="k-footnote flex items-center gap-1.5 font-medium text-accent">
            <Icon name="calendar" size={15} />
            <span className="min-w-0 truncate">{event.date}</span>
          </p>
        ) : null}

        {location ? (
          <p className="k-footnote k-ink-tertiary flex items-center gap-1.5">
            <Icon name="mapPin" size={15} />
            <span className="min-w-0 truncate">{location}</span>
          </p>
        ) : null}

        {description ? (
          <p className="k-subhead k-ink-secondary mt-1 line-clamp-3">{description}</p>
        ) : null}
      </div>
    </article>
  );
}
