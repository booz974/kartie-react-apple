import { Link } from 'react-router';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import { surfaceClass } from '@/components/ui/Surface';
import { CATEGORIES, themeEmoji } from '@/design/categories';
import type { Realisation } from '@/lib/types/contract';

interface ArticleCardProps {
  article: Realisation;
  onDelete: (id: number) => void;
}

/**
 * Vignette d'une réalisation.
 *
 * La photo occupe le haut de la carte et porte le contenu : c'est elle qu'on
 * reconnaît avant d'avoir lu le titre. Sans photo, le dégradé violet des
 * réalisations et l'émoji du sujet tiennent le rôle, et la grille reste vivante.
 *
 * Un seul lien porte la carte entière : il s'étend sous toute la surface, au
 * lieu d'un `div` cliquable. La cible reste annoncée une seule fois et le
 * clavier la traverse comme n'importe quel lien.
 */
export default function ArticleCard({ article, onDelete }: ArticleCardProps) {
  const imageUrl = (article.image_url as string) || '';
  const category = (article.category as string) || '';
  const description = (article.description as string) || '';
  const emoji = themeEmoji(category, CATEGORIES.project.emoji);

  return (
    <article
      className={surfaceClass({
        interactive: true,
        className: 'group relative flex h-full flex-col overflow-hidden',
      })}
    >
      <AdminDeleteButton tableName="realisations" itemId={article.id} onDeleted={onDelete} />

      <Media src={imageUrl} category="project" emoji={emoji} ratio="16 / 10" />

      {/* L'étiquette est posée sur la photo : la nature du contenu se lit au
          moment même où l'œil s'arrête sur l'image. */}
      <span className="absolute left-3 top-3 z-10">
        <Badge tone="project" emoji={emoji} onMedia>
          {category || CATEGORIES.project.label}
        </Badge>
      </span>

      <div className="flex flex-1 flex-col gap-2 p-5">
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

        <p className="k-footnote mt-auto flex items-center gap-1 pt-3 font-semibold text-cat-project-ink">
          Lire la suite
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
