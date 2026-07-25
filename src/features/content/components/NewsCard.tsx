import { Link } from 'react-router';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import Icon from '@/components/ui/Icon';
import type { News } from '@/lib/types/contract';

interface NewsCardProps {
  news: News;
  onDelete: (id: number) => void;
}

/**
 * Rangée d'actualité.
 *
 * Une actualité est du texte : elle se lit mieux dans une liste séparée par
 * des filets que dans une carte de plus. Le conteneur (`k-list`) porte le
 * filet, la rangée ne porte que son rythme.
 */
export default function NewsCard({ news, onDelete }: NewsCardProps) {
  return (
    <article className="k-press-subtle relative py-5">
      <AdminDeleteButton tableName="actualites" itemId={news.id} onDeleted={onDelete} />

      <div className="pr-12">
        {news.date ? <p className="k-caption k-ink-tertiary mb-1.5">{news.date}</p> : null}

        <h3 className="k-title-3 text-balance">
          <Link
            to={`/actualites/${news.id}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {news.title}
          </Link>
        </h3>

        {news.content ? (
          <p className="k-body k-ink-secondary k-measure mt-2 line-clamp-3">{news.content}</p>
        ) : null}

        <p className="k-footnote mt-3 flex items-center gap-1 font-medium text-accent">
          Lire l&apos;actualité
          <Icon name="arrowRight" size={15} />
        </p>
      </div>
    </article>
  );
}
