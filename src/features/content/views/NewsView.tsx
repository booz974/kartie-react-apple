import { useNavigate, useParams } from 'react-router';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Notice from '@/components/ui/Notice';
import { Page } from '@/components/ui/Page';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import { useNews } from '@/queries/territory';

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="plain"
      onClick={onClick}
      leading={<Icon name="chevronLeft" size={16} />}
      className="k-footnote -ml-1 mb-3 font-medium"
    >
      Retour
    </Button>
  );
}

export default function NewsView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const newsId = idParam ? parseInt(idParam, 10) : undefined;

  const { data: news, isLoading, isError, isFetching, refetch } = useNews(newsId);

  function goBack() {
    if (news?.quartier_id) {
      navigate(`/quartiers/${news.quartier_id}/list?type=actualites`);
    } else {
      navigate(-1);
    }
  }

  if (isLoading || (isFetching && !news && !isError)) {
    return (
      <Page className="k-page--reading pt-6">
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton height="2rem" />
          <Skeleton width="55%" height="2rem" />
          <Skeleton width="8rem" height="0.75rem" className="mt-1" />
          <SkeletonText lines={7} className="mt-4" />
        </div>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page className="k-page--reading pt-6">
        <BackButton onClick={goBack} />
        <h1 className="k-title-1 mb-4">Actualité</h1>
        <Notice tone="danger">
          <p className="font-medium">Impossible de charger cette actualité.</p>
          <p className="k-footnote mt-1">Vérifiez votre connexion, puis réessayez.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refetch()}>
            Réessayer
          </Button>
        </Notice>
      </Page>
    );
  }

  if (!news) {
    return (
      <Page className="k-page--reading pt-6">
        <h1 className="k-visually-hidden">Actualité introuvable</h1>
        <EmptyState
          icon="newspaper"
          title="Cette actualité est introuvable"
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

  const publishedOn = formatDate(news.date);

  return (
    <Page className="k-page--reading pt-6">
      <BackButton onClick={goBack} />

      <article>
        <h1 className="k-title-large text-balance">{news.title}</h1>
        {publishedOn ? <p className="k-footnote k-ink-tertiary mt-3">{publishedOn}</p> : null}

        <div className="k-prose k-measure k-hairline-top mt-6 whitespace-pre-line pt-6">
          {news.content}
        </div>
      </article>
    </Page>
  );
}
