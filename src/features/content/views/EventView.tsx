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
import { useEvent } from '@/queries/territory';
import { formatEventDate } from '@/utils/dateFormatter';

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

export default function EventView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const eventId = idParam ? parseInt(idParam, 10) : undefined;

  const { data: event, isLoading, isError, isFetching, refetch } = useEvent(eventId);

  function goBack() {
    if (event?.quartier_id) {
      navigate(`/quartiers/${event.quartier_id}/list?type=events`);
    } else {
      navigate(-1);
    }
  }

  if (isLoading || (isFetching && !event && !isError)) {
    return (
      <Page className="k-page--reading pt-6">
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton height="18rem" radius="var(--k-radius-xl)" />
          <Skeleton height="2rem" className="mt-2" />
          <Skeleton width="60%" height="1rem" />
          <Skeleton width="40%" height="1rem" />
          <SkeletonText lines={5} className="mt-3" />
        </div>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page className="k-page--reading pt-6">
        <BackButton onClick={goBack} />
        <h1 className="k-title-1 mb-4">Événement</h1>
        <Notice tone="danger">
          <p className="font-medium">Impossible de charger cet événement.</p>
          <p className="k-footnote mt-1">Vérifiez votre connexion, puis réessayez.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refetch()}>
            Réessayer
          </Button>
        </Notice>
      </Page>
    );
  }

  if (!event) {
    return (
      <Page className="k-page--reading pt-6">
        <h1 className="k-visually-hidden">Événement introuvable</h1>
        <div className="k-empty">
          <Chip tone="event" size={72}>
            🎉
          </Chip>
          <p className="k-title-3">Cet événement n&apos;est plus à l&apos;affiche</p>
          <p className="k-subhead k-ink-secondary k-measure">
            Il a peut-être été annulé, ou l&apos;adresse est incorrecte. D&apos;autres rendez-vous
            vous attendent près de chez vous.
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

  const imageSrc = event.image || event.image_url || '';
  const descriptionHtml = DOMPurify.sanitize(event.description ?? '');
  const location = (event.location as string) || '';

  return (
    <Page className="k-page--reading pt-6">
      <BackButton onClick={goBack} />

      <article>
        {/* L'affiche ouvre la page : on décide d'y aller sur une image, pas sur
            une fiche. */}
        <Media
          src={imageSrc}
          category="event"
          ratio={imageSrc ? '16 / 9' : '21 / 9'}
          rounded="var(--k-radius-xl)"
          loading="eager"
          className="shadow-lg"
        />

        <Badge tone="event" emoji="🎉" size="lg" className="mt-6">
          Événement
        </Badge>

        <h1 className="k-title-large mt-3 text-balance">{event.title}</h1>

        {/* Date et lieu sont les deux informations qui décident d'y aller ou
            non : elles viennent juste après le titre, groupées, et posées sur
            leur propre plaque de verre. */}
        <dl className="k-card mt-5 flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <dt className="k-visually-hidden">Date</dt>
            <Chip tone="event" size={38}>
              📅
            </Chip>
            <dd className="k-callout font-semibold text-cat-event-ink">
              {formatEventDate(event.date)}
            </dd>
          </div>
          {location ? (
            <div className="flex items-center gap-3">
              <dt className="k-visually-hidden">Lieu</dt>
              <Chip tone="quartier" size={38}>
                📍
              </Chip>
              <dd className="k-callout k-ink-secondary">{location}</dd>
            </div>
          ) : null}
        </dl>

        <div
          className="k-prose k-measure mt-8"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      </article>
    </Page>
  );
}
