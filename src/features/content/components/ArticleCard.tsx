import { Link } from 'react-router';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import Icon from '@/components/ui/Icon';
import { surfaceClass } from '@/components/ui/Surface';
import type { Realisation } from '@/lib/types/contract';

interface ArticleCardProps {
  article: Realisation;
  onDelete: (id: number) => void;
}

/**
 * Élément de grille des réalisations.
 *
 * Un seul lien porte la carte entière — il s'étend sous toute la surface — au
 * lieu d'un `div` cliquable : la cible reste annoncée une seule fois et le
 * clavier la traverse comme n'importe quel lien.
 */
export default function ArticleCard({ article, onDelete }: ArticleCardProps) {
  const imageUrl = (article.image_url as string) || '';
  const category = (article.category as string) || '';
  const description = (article.description as string) || '';

  return (
    <article
      className={surfaceClass({
        interactive: true,
        className: 'relative flex h-full flex-col overflow-hidden',
      })}
    >
      <AdminDeleteButton tableName="realisations" itemId={article.id} onDeleted={onDelete} />

      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="aspect-[16/10] w-full bg-canvas-sunken object-cover"
        />
      ) : (
        <div
          className="grid aspect-[16/10] w-full place-items-center bg-canvas-sunken text-ink-quaternary"
          aria-hidden="true"
        >
          <Icon name="image" size={26} />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-5">
        {category ? <p className="k-eyebrow">{category}</p> : null}

        <h3 className="k-title-3 text-balance">
          <Link
            to={`/realisations/${article.id}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {article.title}
          </Link>
        </h3>

        {description ? (
          <p className="k-subhead k-ink-secondary line-clamp-3">{description}</p>
        ) : null}

        <p className="k-footnote mt-auto flex items-center gap-1 pt-3 font-medium text-accent">
          Lire la suite
          <Icon name="arrowRight" size={15} />
        </p>
      </div>
    </article>
  );
}
