import { useNavigate, useParams } from 'react-router';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import { Page, PageHeader } from '@/components/ui/Page';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import {
  eventStatusLabel,
  eventStatusTone,
} from '@/features/associations/components/AssociationEventCard';
import { useAssociationEvent } from '@/queries/associations';

export default function AssociationEventView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const eventId = idParam ? parseInt(idParam, 10) : undefined;

  const { data: event, isLoading, isError } = useAssociationEvent(eventId);

  function goBack() {
    if (event?.association?.slug) {
      navigate(`/associations/${event.association.slug}`);
      return;
    }
    navigate(-1);
  }

  if (isLoading) {
    return (
      <Page className="k-page--reading pt-6 md:pt-10">
        <Skeleton height="14rem" radius="var(--k-radius-xl)" />
        <Skeleton height="1rem" width="10rem" className="mt-6" />
        <Skeleton height="2.25rem" width="75%" className="mt-3" />
        <SkeletonText lines={6} className="mt-6" />
      </Page>
    );
  }

  if (isError || !event) {
    return (
      <Page className="k-page--reading pt-6 md:pt-10">
        <h1 className="k-visually-hidden">Événement introuvable</h1>
        <EmptyState
          icon="calendar"
          title="Événement introuvable"
          description="Cet événement n’existe pas ou n’est plus publié."
          action={
            <Button variant="primary" onClick={() => navigate(-1)}>
              Revenir en arrière
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <Page className="k-page--reading pt-6 md:pt-10">
      <Button
        variant="plain"
        onClick={goBack}
        className="-ml-1 mb-4"
        leading={<Icon name="chevronLeft" size={16} />}
      >
        Retour
      </Button>

      {event.image_url ? (
        <img
          src={event.image_url}
          alt=""
          className="mb-7 h-56 w-full rounded-xl border border-separator object-cover md:h-72"
        />
      ) : null}

      <PageHeader
        eyebrow={event.association?.name || 'Association locale'}
        title={event.title}
        meta={
          <>
            <Badge tone="accent" icon="calendar">
              {event.display_date}
            </Badge>
            <Badge tone={eventStatusTone(event.status)} dot>
              {eventStatusLabel(event.status)}
            </Badge>
          </>
        }
      />

      <p className="k-callout k-ink-secondary k-measure whitespace-pre-line">
        {event.description as string}
      </p>

      <dl
        className="k-list k-hairline-top mt-8 pt-2"
        hidden={!event.location && !event.external_url}
      >
        {event.location ? (
          <div className="flex items-start gap-3 py-4">
            <Icon name="mapPin" size={18} className="k-ink-tertiary mt-0.5" />
            <div className="min-w-0">
              <dt className="k-caption k-ink-tertiary">Lieu</dt>
              <dd className="k-subhead k-ink break-words">{event.location}</dd>
            </div>
          </div>
        ) : null}

        {event.external_url ? (
          <div className="flex items-start gap-3 py-4">
            <Icon name="link" size={18} className="k-ink-tertiary mt-0.5" />
            <div className="min-w-0">
              <dt className="k-caption k-ink-tertiary">En savoir plus</dt>
              <dd className="k-subhead break-words">
                <a
                  href={event.external_url as string}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-accent hover:underline"
                >
                  Ouvrir le lien externe
                  <Icon name="externalLink" size={15} />
                </a>
              </dd>
            </div>
          </div>
        ) : null}
      </dl>
    </Page>
  );
}
