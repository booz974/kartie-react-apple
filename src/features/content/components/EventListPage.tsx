import EventCard from '@/features/content/components/EventCard';
import type { AgendaEvent } from '@/lib/types/contract';

interface EventListPageProps {
  events: AgendaEvent[];
  quartierName: string;
  onBack: () => void;
  onDelete: (id: number | string) => void;
}

export default function EventListPage({
  events,
  quartierName,
  onBack,
  onDelete,
}: EventListPageProps) {
  return (
    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-lg max-w-6xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-full transition hover:bg-gray-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Retour au quartier
      </button>
      <h2 className="text-4xl font-bold text-center mb-8">
        Tous les événements pour {quartierName}
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.map((event) => (
          <EventCard key={event.id} event={event} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
