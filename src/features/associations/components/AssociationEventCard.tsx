import type { AssociationEvent } from '@/lib/types/contract';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  cancelled: 'Annulé',
  archived: 'Archivé',
  removed: 'Retiré',
};

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  archived: 'bg-slate-100 text-slate-700',
  removed: 'bg-red-100 text-red-700',
};

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
  const statusLabel = STATUS_LABELS[event.status] || event.status;
  const statusClass = STATUS_CLASSES[event.status] || 'bg-slate-100 text-slate-700';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-600">
            {event.display_date}
          </p>
          <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-slate-700">
        {event.description as string}
      </p>

      <div className="space-y-2 text-sm text-slate-600">
        <p>{event.location}</p>
        {event.external_url ? (
          <p>
            <a
              href={event.external_url as string}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-600 hover:underline"
            >
              Lien externe
            </a>
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onOpen(event)}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Voir le détail
        </button>
        {canEdit && onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(event)}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
          >
            Modifier
          </button>
        ) : null}
      </div>
    </div>
  );
}
