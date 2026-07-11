import { useNavigate, useParams } from 'react-router';
import { useNews } from '@/queries/territory';

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

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function NewsView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const newsId = idParam ? parseInt(idParam, 10) : undefined;

  const { data: news, isLoading, isError, isFetching, refetch } = useNews(newsId);

  function goBack() {
    if (news?.quartier_id) {
      navigate(`/quartiers/${news.quartier_id}/list?type=actualites`);
    } else {
      navigate(-1);
    }
  }

  if (isLoading || (isFetching && !news && !isError)) {
    return (
      <div className="text-center p-10">
        <p className="text-xl font-semibold text-gray-700">Chargement de l&apos;actualité...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-10">
        <p className="text-red-500 font-bold">Erreur : Impossible de charger l&apos;actualité.</p>
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

  if (!news) {
    return (
      <div className="text-center p-10">
        <p>Actualité introuvable.</p>
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
        <h2 className="text-4xl font-bold text-gray-900 mb-3">{news.title}</h2>
        <p className="text-sm font-semibold text-gray-500 mb-6">{formatDate(news.date)}</p>
        <div className="text-gray-800 leading-relaxed whitespace-pre-line">{news.content}</div>
      </div>
    </div>
  );
}
