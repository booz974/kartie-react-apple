import { useNavigate } from 'react-router';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import type { News } from '@/lib/types/contract';

interface NewsCardProps {
  news: News;
  onDelete: (id: number) => void;
}

export default function NewsCard({ news, onDelete }: NewsCardProps) {
  const navigate = useNavigate();

  function navigateToNews() {
    navigate(`/actualites/${news.id}`);
  }

  return (
    <div
      className="relative news-card bg-gray-50 p-6 rounded-xl h-full cursor-pointer hover:shadow-md transition-all"
      onClick={navigateToNews}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToNews();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <AdminDeleteButton tableName="actualites" itemId={news.id} onDeleted={onDelete} />
      <p className="text-sm text-gray-500 mb-2">{news.date}</p>
      <h4 className="font-bold text-lg text-gray-800 mb-3">{news.title}</h4>
      <p className="text-sm text-gray-700">{news.content}</p>
    </div>
  );
}
