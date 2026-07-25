import { useNavigate, useParams } from 'react-router';
import DOMPurify from 'dompurify';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Notice from '@/components/ui/Notice';
import { Page } from '@/components/ui/Page';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
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

  // Le gabarit de chargement épouse la forme de l'article : titre, chapô,
  // image, puis corps de texte. Rien ne saute au moment du remplacement.
  if (isLoading || (isFetching && !article && !isError)) {
    return (
      <Page className="k-page--reading pt-6">
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton width="7rem" height="0.75rem" />
          <Skeleton height="2.25rem" />
          <Skeleton width="70%" height="2.25rem" />
          <Skeleton height="1rem" width="85%" className="mt-2" />
          <Skeleton height="16rem" radius="var(--k-radius-lg)" className="mt-4" />
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
        <EmptyState
          icon="document"
          title="Cette réalisation est introuvable"
          description="Elle a peut-être été retirée, ou l'adresse est incorrecte."
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Retour à l&apos;accueil
            </Button>
          }
        />
      </Page>
    );
  }

  const contentHtml = DOMPurify.sanitize(article.content ?? '');
  const imageUrl = (article.image_url as string) || '';
  const category = (article.category as string) || '';
  const description = (article.description as string) || '';

  return (
    <Page className="k-page--reading pt-6">
      <BackButton onClick={goBack}>Retour</BackButton>

      <article>
        <header className="pb-8">
          {category ? <p className="k-eyebrow mb-2">{category}</p> : null}
          <h1 className="k-title-large text-balance">{article.title}</h1>
          {description ? (
            <p className="k-callout k-ink-secondary k-measure mt-3">{description}</p>
          ) : null}
        </header>

        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="mb-8 max-h-[32rem] w-full rounded-lg bg-canvas-sunken object-cover"
          />
        ) : null}

        <div
          className="k-prose k-measure"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>
    </Page>
  );
}
