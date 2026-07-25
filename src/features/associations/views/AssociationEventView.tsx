import { useNavigate, useParams } from 'react-router';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import { Page, PageHeader } from '@/components/ui/Page';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import {
  associationEventStyle,
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
        <Skeleton height="14rem" radius="var(--k-radius-2xl)" />
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

  const { emoji, gradient } = associationEventStyle(event.category);

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

      <Media
        src={event.image_url}
        category="event"
        emoji={emoji}
        gradient={gradient}
        ratio="16 / 7"
        rounded="var(--k-radius-2xl)"
        loading="eager"
        overlay={
          <div className="flex flex-wrap items-center gap-2">
            {event.display_date ? (
              <Badge onMedia size="lg" emoji="🗓️">
                {event.display_date}
              </Badge>
            ) : null}
            <Badge onMedia size="lg" tone={eventStatusTone(event.status)} dot>
              {eventStatusLabel(event.status)}
            </Badge>
          </div>
        }
      />

      <PageHeader
        className="pt-7"
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true">{emoji}</span>
            {event.association?.name || 'Association locale'}
          </span>
        }
        title={event.title}
      />

      <p className="k-callout k-ink-secondary k-measure whitespace-pre-line">
        {event.description as string}
      </p>

      <dl className="k-card mt-8 flex flex-col p-5" hidden={!event.location && !event.external_url}>
        {event.location ? (
          <div className="flex items-start gap-3 py-2">
            <Chip tone="quartier" size={38}>
              📍
            </Chip>
            <div className="min-w-0">
              <dt className="k-caption k-ink-tertiary">Lieu</dt>
              <dd className="k-subhead k-ink break-words">{event.location}</dd>
            </div>
          </div>
        ) : null}

        {event.external_url ? (
          <div className="flex items-start gap-3 py-2">
            <Chip tone="project" size={38}>
              🔗
            </Chip>
            <div className="min-w-0">
              <dt className="k-caption k-ink-tertiary">En savoir plus</dt>
              <dd className="k-subhead break-words">
                <a
                  href={event.external_url as string}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-ink inline-flex items-center gap-1.5 font-medium hover:underline"
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
