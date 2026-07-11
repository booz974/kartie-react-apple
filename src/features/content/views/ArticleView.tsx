import { useNavigate, useParams } from 'react-router';
import DOMPurify from 'dompurify';
import { useRealisation } from '@/queries/territory';

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

export default function ArticleView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const articleId = idParam ? parseInt(idParam, 10) : undefined;

  const { data: article, isLoading, isError, isFetching, refetch } = useRealisation(articleId);

  function goBack() {
    if (article?.quartier_id) {
      navigate(`/quartiers/${article.quartier_id}/list?type=realisations`);
    } else {
      navigate(-1);
    }
  }

  if (isLoading || (isFetching && !article && !isError)) {
    return (
      <div className="article-view-container bg-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center p-10">
            <p className="text-xl font-semibold text-gray-700">Chargement de l&apos;article...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="article-view-container bg-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center p-10">
            <p className="text-red-500 font-bold">Erreur : Impossible de charger l&apos;article.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="article-view-container bg-gray-100 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center p-10">
            <p>Article introuvable.</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  const contentHtml = DOMPurify.sanitize(article.content ?? '');
  const imageUrl = (article.image_url as string) || '';

  return (
    <div className="article-view-container bg-gray-100 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        <button
          type="button"
          onClick={goBack}
          className="mb-8 inline-flex items-center gap-2 text-gray-600 font-semibold py-2 px-4 rounded-full transition hover:bg-gray-200"
        >
          <BackIcon />
          Retour
        </button>

        <article className="bg-white p-8 md:p-12 rounded-lg shadow-lg">
          <header className="text-center border-b pb-8 mb-8">
            <p className="text-base font-bold uppercase text-indigo-600 mb-2">
              {(article.category as string) || ''}
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
              {article.title}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 font-light">
              {(article.description as string) || ''}
            </p>
          </header>

          {imageUrl ? (
            <img
              src={imageUrl}
              alt={article.title}
              className="w-full h-auto max-h-[500px] object-cover rounded-lg mb-8 shadow-md"
            />
          ) : null}

          <div
            className="prose prose-lg max-w-none text-gray-800 article-prose"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </article>
      </div>

      <style>{`
        .article-prose h2 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 2.5em;
          margin-bottom: 1.25em;
        }
        .article-prose p {
          line-height: 1.75;
          margin-bottom: 1.5em;
        }
        .article-prose img {
          border-radius: 0.5rem;
          margin-top: 2em;
          margin-bottom: 2em;
        }
      `}</style>
    </div>
  );
}
