import { useNavigate } from 'react-router';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import type { AgendaEvent } from '@/lib/types/contract';

interface EventCardProps {
  event: AgendaEvent;
  onDelete: (id: number | string) => void;
}

export default function EventCard({ event, onDelete }: EventCardProps) {
  const navigate = useNavigate();

  function navigateToEvent() {
    navigate(event.routePath || `/events/${event.id}`);
  }

  const tableName = event.source === 'association' ? 'association_events' : 'events';
  const targetId = event.source === 'association' ? event.original_id : (event as { id: number }).id;

  return (
    <div
      onClick={navigateToEvent}
      className="relative event-card bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full cursor-pointer"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToEvent();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <AdminDeleteButton tableName={tableName} itemId={targetId} onDeleted={() => onDelete(event.id)} />
      <img
        src={event.image || (event as { image_url?: string }).image_url || ''}
        alt={event.title}
        className="w-full h-40 object-cover"
      />
      <div className="p-6 flex flex-col flex-grow">
        {event.source === 'association' ? (
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">
            Association{event.association_name ? ` · ${event.association_name}` : ''}
          </p>
        ) : null}
        <h4 className="font-bold text-lg text-gray-800 mb-2">{event.title}</h4>
        <p className="text-sm font-semibold text-blue-600 mb-1">{event.date}</p>
        <p className="text-sm text-gray-500 mb-4">
          {(event as { location?: string }).location}
        </p>
        <p className="text-sm text-gray-700 flex-grow">
          {(event as { description?: string }).description}
        </p>
      </div>
    </div>
  );
}
