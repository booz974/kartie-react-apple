import { Link } from 'react-router';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import { surfaceClass } from '@/components/ui/Surface';
import { CATEGORIES } from '@/design/categories';
import type { News } from '@/lib/types/contract';

interface NewsCardProps {
  news: News;
  onDelete: (id: number) => void;
}

/**
 * Carte d'actualité.
 *
 * Une actualité se parcourt comme un fil : une image en grand, une étiquette
 * bleue qui dit sa nature, un titre, trois lignes de texte. La photo manque
 * souvent ; le dégradé de la catégorie et son émoji la remplacent sans laisser
 * de trou dans la page.
 */
export default function NewsCard({ news, onDelete }: NewsCardProps) {
  const imageUrl = (news.image_url as string) || '';

  return (
    <article
      className={surfaceClass({
        interactive: true,
        className: 'k-glass--news group relative flex flex-col overflow-hidden',
      })}
    >
      <AdminDeleteButton tableName="actualites" itemId={news.id} onDeleted={onDelete} />

      <Media
        src={imageUrl}
        category="news"
        ratio={imageUrl ? '16 / 9' : '21 / 9'}
      />

      <span className="absolute left-3 top-3 z-10">
        <Badge tone="news" emoji={CATEGORIES.news.emoji} onMedia>
          {CATEGORIES.news.label}
        </Badge>
      </span>

      <div className="flex flex-col gap-2 p-5">
        {news.date ? <p className="k-caption k-ink-tertiary">{news.date}</p> : null}

        <h3 className="k-title-3 text-balance">
          <Link
            to={`/actualites/${news.id}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {news.title}
          </Link>
        </h3>

        {news.content ? (
          <p className="k-body k-ink-secondary line-clamp-3">{news.content}</p>
        ) : null}

        <p className="k-footnote mt-1 flex items-center gap-1 font-semibold text-cat-news-ink">
          Lire l&apos;actualité
          <Icon
            name="arrowRight"
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </p>
      </div>
    </article>
  );
}
