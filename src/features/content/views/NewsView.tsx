import { useNavigate, useParams } from 'react-router';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
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
          <Skeleton height="14rem" radius="var(--k-radius-xl)" />
          <Skeleton height="2rem" className="mt-2" />
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
        <div className="k-empty">
          <Chip tone="news" size={72}>
            📰
          </Chip>
          <p className="k-title-3">Cette actualité n&apos;est plus là</p>
          <p className="k-subhead k-ink-secondary k-measure">
            Elle a peut-être été retirée, ou l&apos;adresse est incorrecte. Les dernières nouvelles
            du quartier, elles, sont toujours en ligne.
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

  const publishedOn = formatDate(news.date);
  const imageUrl = (news.image_url as string) || '';

  return (
    <Page className="k-page--reading pt-6">
      <BackButton onClick={goBack} />

      <article>
        {/* Même sans photo, la page s'ouvre en couleur : le dégradé de la
            catégorie tient lieu de couverture. */}
        <Media
          src={imageUrl}
          category="news"
          ratio={imageUrl ? '16 / 9' : '21 / 9'}
          rounded="var(--k-radius-xl)"
          loading="eager"
          className="shadow-lg"
        />

        <Badge tone="news" emoji="📰" size="lg" className="mt-6">
          Actualité
        </Badge>

        <h1 className="k-title-large mt-3 text-balance">{news.title}</h1>
        {publishedOn ? (
          <p className="k-footnote k-ink-tertiary mt-3">
            <span aria-hidden="true">🗓️ </span>
            Publiée le {publishedOn}
          </p>
        ) : null}

        <div className="k-prose k-measure mt-8 whitespace-pre-line">{news.content}</div>
      </article>
    </Page>
  );
}
