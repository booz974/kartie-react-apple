import ArticleCard from '@/features/content/components/ArticleCard';
import type { Realisation } from '@/lib/types/contract';

interface ArticleListPageProps {
  articles: Realisation[];
  quartierName: string;
  onBack: () => void;
  onDelete: (id: number) => void;
}

export default function ArticleListPage({
  articles,
  quartierName,
  onBack,
  onDelete,
}: ArticleListPageProps) {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 bg-white/30 text-slate-800 font-semibold py-2 px-5 rounded-full shadow hover:bg-white/50"
      >
        &larr; Retour à {quartierName}
      </button>
      <h1 className="text-4xl font-bold mb-8">Nos réalisations à {quartierName}</h1>
      {articles && articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-10">
          Aucune réalisation à afficher pour le moment.
        </p>
      )}
    </div>
  );
}
