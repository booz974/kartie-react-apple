import { useNavigate, useParams } from 'react-router';
import DOMPurify from 'dompurify';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
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
          <Skeleton height="14rem" radius="var(--k-radius-lg)" />
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
        <EmptyState
          icon="calendar"
          title="Cet événement est introuvable"
          description="Il a peut-être été annulé, ou l'adresse est incorrecte."
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Retour à l&apos;accueil
            </Button>
          }
        />
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
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className="mb-6 h-64 w-full rounded-lg bg-canvas-sunken object-cover"
          />
        ) : null}

        <h1 className="k-title-large text-balance">{event.title}</h1>

        {/* Date et lieu sont les deux informations qui décident d'y aller ou
            non : elles viennent juste après le titre, groupées. */}
        <dl className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <dt className="k-visually-hidden">Date</dt>
            <Icon name="calendar" size={17} className="text-accent" />
            <dd className="k-callout font-medium text-accent">{formatEventDate(event.date)}</dd>
          </div>
          {location ? (
            <div className="flex items-center gap-2">
              <dt className="k-visually-hidden">Lieu</dt>
              <Icon name="mapPin" size={17} className="k-ink-tertiary" />
              <dd className="k-subhead k-ink-secondary">{location}</dd>
            </div>
          ) : null}
        </dl>

        <div
          className="k-prose k-measure k-hairline-top mt-6 pt-6"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      </article>
    </Page>
  );
}
