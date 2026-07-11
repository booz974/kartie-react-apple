import { useNavigate, useParams } from 'react-router';
import { useAssociationEvent } from '@/queries/associations';

export default function AssociationEventView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const eventId = idParam ? parseInt(idParam, 10) : undefined;

  const { data: event, isLoading, isError } = useAssociationEvent(eventId);

  function goBack() {
    if (event?.association?.slug) {
      navigate(`/associations/${event.association.slug}`);
      return;
    }
    navigate(-1);
  }

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        <p className="text-xl font-semibold text-slate-700">Chargement de l'événement...</p>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="p-10 text-center">
        <p className="text-xl font-semibold text-slate-700">Événement introuvable.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto my-8 max-w-4xl rounded-3xl bg-white p-6 shadow-xl md:p-8">
      <button
        type="button"
        onClick={goBack}
        className="mb-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
      >
        Retour
      </button>

      {event.image_url ? (
        <img
          src={event.image_url}
          alt={event.title}
          className="mb-6 h-64 w-full rounded-3xl object-cover"
        />
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
          {event.display_date}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
          {event.status}
        </span>
      </div>

      <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">{event.title}</h1>
      <p className="mt-3 text-sm font-semibold text-slate-500">
        {event.association?.name || 'Association locale'}
      </p>

      <p className="mt-6 whitespace-pre-line text-slate-700">{event.description as string}</p>

      <div className="mt-6 space-y-3 rounded-3xl bg-slate-50 p-5">
        <p className="text-sm text-slate-700">{event.location}</p>
        {event.external_url ? (
          <p>
            <a
              href={event.external_url as string}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-600 hover:underline"
            >
              Ouvrir le lien externe
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
