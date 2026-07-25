import { useNavigate, useParams } from 'react-router';
import DOMPurify from 'dompurify';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import Notice from '@/components/ui/Notice';
import { Page } from '@/components/ui/Page';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import { CATEGORIES, themeEmoji } from '@/design/categories';
import { useRealisation } from '@/queries/territory';

function BackButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <Button
      variant="plain"
      onClick={onClick}
      leading={<Icon name="chevronLeft" size={16} />}
      className="k-footnote -ml-1 mb-3 font-medium"
    >
      {children}
    </Button>
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

  // Le gabarit de chargement épouse la forme de l'article : image de couverture,
  // étiquette, titre, chapô, puis corps de texte. Rien ne saute au remplacement.
  if (isLoading || (isFetching && !article && !isError)) {
    return (
      <Page className="k-page--reading pt-6">
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton height="18rem" radius="var(--k-radius-xl)" />
          <Skeleton width="7rem" height="1.5rem" radius="var(--k-radius-full)" className="mt-2" />
          <Skeleton height="2.25rem" />
          <Skeleton width="70%" height="2.25rem" />
          <SkeletonText lines={6} className="mt-4" />
        </div>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page className="k-page--reading pt-6">
        <BackButton onClick={goBack}>Retour</BackButton>
        <h1 className="k-title-1 mb-4">Réalisation</h1>
        <Notice tone="danger">
          <p className="font-medium">Impossible de charger cet article.</p>
          <p className="k-footnote mt-1">
            Vérifiez votre connexion, puis réessayez.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refetch()}>
            Réessayer
          </Button>
        </Notice>
      </Page>
    );
  }

  if (!article) {
    return (
      <Page className="k-page--reading pt-6">
        <h1 className="k-visually-hidden">Réalisation introuvable</h1>
        <div className="k-empty">
          <Chip tone="project" size={72}>
            🏗️
          </Chip>
          <p className="k-title-3">Cette réalisation a disparu</p>
          <p className="k-subhead k-ink-secondary k-measure">
            Elle a peut-être été retirée, ou l&apos;adresse est incorrecte. Le reste du quartier
            vous attend.
          </p>
          <div className="mt-2">
            <Button variant="primary" onClick={() => navigate('/')}>
              <span aria-hidden="true">🏠</span>
              Retour à l&apos;accueil
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  const contentHtml = DOMPurify.sanitize(article.content ?? '');
  const imageUrl = (article.image_url as string) || '';
  const category = (article.category as string) || '';
  const description = (article.description as string) || '';
  const emoji = themeEmoji(category, CATEGORIES.project.emoji);

  return (
    <Page className="k-page--reading pt-6">
      <BackButton onClick={goBack}>Retour</BackButton>

      <article>
        {/* La page s'ouvre sur l'image : c'est elle qui dit de quoi on parle
            avant la première ligne de texte. */}
        <Media
          src={imageUrl}
          category="project"
          emoji={emoji}
          ratio={imageUrl ? '16 / 9' : '21 / 9'}
          rounded="var(--k-radius-xl)"
          loading="eager"
          className="shadow-lg"
        />

        <header className="pb-8 pt-6">
          <Badge tone="project" emoji={emoji} size="lg">
            {category || CATEGORIES.project.label}
          </Badge>
          <h1 className="k-title-large mt-3 text-balance">{article.title}</h1>
          {description ? (
            <p className="k-callout k-ink-secondary k-measure mt-3">{description}</p>
          ) : null}
        </header>

        <div
          className="k-prose k-measure"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>
    </Page>
  );
}
