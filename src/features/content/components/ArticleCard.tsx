import { useNavigate } from 'react-router';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import type { Realisation } from '@/lib/types/contract';

interface ArticleCardProps {
  article: Realisation;
  onDelete: (id: number) => void;
}

export default function ArticleCard({ article, onDelete }: ArticleCardProps) {
  const navigate = useNavigate();

  function navigateToArticle() {
    navigate(`/realisations/${article.id}`);
  }

  return (
    <div
      onClick={navigateToArticle}
      className="relative article-card bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full cursor-pointer"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToArticle();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <AdminDeleteButton tableName="realisations" itemId={article.id} onDeleted={onDelete} />
      <img
        src={(article.image_url as string) || ''}
        alt={article.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-5 flex flex-col flex-grow">
        <p className="text-xs font-bold uppercase text-indigo-600 mb-2">
          {article.category as string}
        </p>
        <h4 className="font-bold text-lg text-gray-900 mb-2">{article.title}</h4>
        <p className="text-sm text-gray-600 mb-4 flex-grow">{article.description as string}</p>
        <div className="mt-auto text-sm font-semibold text-indigo-700 hover:text-indigo-900 transition-colors">
          Lire la suite →
        </div>
      </div>
    </div>
  );
}
