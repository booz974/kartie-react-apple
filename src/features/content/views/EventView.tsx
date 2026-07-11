import { useNavigate, useParams } from 'react-router';
import DOMPurify from 'dompurify';
import { useEvent } from '@/queries/territory';
import { formatEventDate } from '@/utils/dateFormatter';

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function EventView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const eventId = idParam ? parseInt(idParam, 10) : undefined;

  const { data: event, isLoading, isError, isFetching, refetch } = useEvent(eventId);

  function goBack() {
    if (event?.quartier_id) {
      navigate(`/quartiers/${event.quartier_id}/list?type=events`);
    } else {
      navigate(-1);
    }
  }

  if (isLoading || (isFetching && !event && !isError)) {
    return (
      <div className="text-center p-10">
        <p className="text-xl font-semibold text-gray-700">Chargement de l&apos;événement...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-10">
        <p className="text-red-500 font-bold">Erreur : Impossible de charger l&apos;événement.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center p-10">
        <p>Événement introuvable.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  const imageSrc = event.image || event.image_url || '';
  const descriptionHtml = DOMPurify.sanitize(event.description ?? '');

  return (
    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-lg max-w-3xl mx-auto my-8">
      <button
        type="button"
        onClick={goBack}
        className="mb-8 inline-flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-full transition hover:bg-gray-300"
      >
        <BackIcon />
        Retour
      </button>

      <div>
        {imageSrc ? (
          <img src={imageSrc} alt={event.title} className="w-full h-64 object-cover rounded-xl mb-6" />
        ) : null}
        <h2 className="text-4xl font-bold text-gray-900 mb-3">{event.title}</h2>
        <p className="text-lg font-semibold text-blue-600 mb-2">{formatEventDate(event.date)}</p>
        <p className="text-md text-gray-600 mb-4">{(event.location as string) || ''}</p>
        <div
          className="text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      </div>
    </div>
  );
}
