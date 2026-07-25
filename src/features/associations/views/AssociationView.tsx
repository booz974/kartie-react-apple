import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import { Page } from '@/components/ui/Page';
import Segmented from '@/components/ui/Segmented';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import AssociationEventCard from '@/features/associations/components/AssociationEventCard';
import AssociationFollowButton from '@/features/associations/components/AssociationFollowButton';
import AssociationHeader from '@/features/associations/components/AssociationHeader';
import { useAssociation } from '@/queries/associations';
import { useAuthStore } from '@/stores/authStore';
import type { AssociationEvent } from '@/lib/types/contract';

const TABS = [
  { value: 'about', label: 'À propos' },
  { value: 'posts', label: 'Publications' },
  { value: 'events', label: 'Événements' },
] as const;

type TabId = (typeof TABS)[number]['value'];

export default function AssociationView() {
  const navigate = useNavigate();
  const toast = useToast();
  const { id: idParam } = useParams<{ id: string }>();

  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [followersDelta, setFollowersDelta] = useState(0);

  const {
    association,
    posts,
    events,
    isFollowing,
    quartierName,
    canManage,
    isLoading,
    isNotFound,
  } = useAssociation(idParam, session?.user?.id, profile?.role);

  function goBack() {
    if (association?.quartier_id) {
      navigate(`/quartiers/${association.quartier_id}/associations`);
      return;
    }
    navigate(-1);
  }

  function openEvent(event: AssociationEvent) {
    navigate(event.routePath || `/associations/events/${event.id}`);
  }

  function handleFollowUpdated(following: boolean) {
    const delta = following ? 1 : -1;
    setFollowersDelta((prev) => prev + delta);
  }

  function handleAuthRequired() {
    toast.info('Connectez-vous pour suivre cette association.');
  }

  if (isLoading) {
    return (
      <Page className="pt-6 md:pt-10">
        <div className="flex flex-col gap-5">
          <Skeleton height="9rem" radius="var(--k-radius-xl)" />
          <div className="flex items-start gap-4">
            <Skeleton width="4rem" height="4rem" radius="var(--k-radius-xl)" />
            <div className="flex-1">
              <Skeleton height="1rem" width="8rem" />
              <Skeleton height="2rem" width="60%" className="mt-3" />
              <Skeleton height="1rem" width="80%" className="mt-3" />
            </div>
          </div>
        </div>
        <div className="mt-10">
          <SkeletonText lines={5} />
        </div>
      </Page>
    );
  }

  if (isNotFound || !association) {
    return (
      <Page className="pt-6 md:pt-10">
        <h1 className="k-visually-hidden">Association introuvable</h1>
        <EmptyState
          icon="handshake"
          title="Association introuvable"
          description="Cette association n’existe pas ou n’est plus publiée."
          action={
            <Button variant="primary" onClick={() => navigate('/quartiers')}>
              Parcourir les quartiers
            </Button>
          }
        />
      </Page>
    );
  }

  const followersCount = Math.max(0, (association.followers_count || 0) + followersDelta);
  const activities = Array.isArray(association.activities) ? association.activities : [];
  const audiences = Array.isArray(association.audiences) ? association.audiences : [];

  return (
    <Page className="pt-6 md:pt-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="plain"
          onClick={goBack}
          className="-ml-1"
          leading={<Icon name="chevronLeft" size={16} />}
        >
          Retour
        </Button>

        {canManage ? (
          <Button
            variant="secondary"
            onClick={() => navigate(`/associations/${association.id}/dashboard`)}
            leading={<Icon name="settings" size={17} />}
          >
            Gérer l’association
          </Button>
        ) : null}
      </div>

      <AssociationHeader
        association={association}
        quartierName={quartierName}
        followersCount={followersCount}
        actions={
          <AssociationFollowButton
            associationId={association.id}
            session={session}
            initialFollowing={isFollowing}
            onUpdated={handleFollowUpdated}
            onAuthRequired={handleAuthRequired}
          />
        }
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <Segmented
            label="Contenus de l’association"
            value={activeTab}
            onChange={setActiveTab}
            options={TABS}
            className="mb-7"
          />

          {activeTab === 'about' ? (
            <div className="flex flex-col gap-8">
              {association.full_description ? (
                <section>
                  <h2 className="k-title-3">À propos</h2>
                  <p className="k-body k-ink-secondary k-measure mt-3 whitespace-pre-line">
                    {association.full_description as string}
                  </p>
                </section>
              ) : null}

              {association.mission ? (
                <section>
                  <h2 className="k-title-3">Mission</h2>
                  <p className="k-body k-ink-secondary k-measure mt-3 whitespace-pre-line">
                    {association.mission as string}
                  </p>
                </section>
              ) : null}

              {activities.length > 0 ? (
                <section>
                  <h2 className="k-title-3">Activités</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {activities.map((activity) => (
                      <li key={String(activity)}>
                        <Badge>{String(activity)}</Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {audiences.length > 0 ? (
                <section>
                  <h2 className="k-title-3">Publics concernés</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {audiences.map((audience) => (
                      <li key={String(audience)}>
                        <Badge tone="accent">
                          {String(audience)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {!association.full_description &&
              !association.mission &&
              activities.length === 0 &&
              audiences.length === 0 ? (
                <EmptyState
                  icon="document"
                  title="Présentation à venir"
                  description="Cette association n’a pas encore détaillé ses activités."
                />
              ) : null}
            </div>
          ) : null}

          {activeTab === 'posts' ? (
            posts.length === 0 ? (
              <EmptyState
                icon="megaphone"
                title="Aucune publication"
                description="Les publications de l’association apparaîtront ici, ainsi que dans le fil du quartier."
              />
            ) : (
              <div className="k-list">
                {posts.map((post) => (
                  <article key={post.id} className="py-6 first:pt-0">
                    {post.title ? <h2 className="k-title-3">{post.title}</h2> : null}
                    <p className="k-body k-ink-secondary k-measure mt-2 whitespace-pre-line">
                      {post.content as string}
                    </p>
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt={post.title || association.name}
                        loading="lazy"
                        className="mt-4 max-h-80 w-full rounded-lg border border-separator object-cover"
                      />
                    ) : null}
                  </article>
                ))}
              </div>
            )
          ) : null}

          {activeTab === 'events' ? (
            events.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="Aucun événement publié"
                description="Dès qu’un événement est programmé, il apparaît ici et dans l’agenda du quartier."
              />
            ) : (
              <div className="k-grid">
                {events.map((event) => (
                  <AssociationEventCard key={event.id} event={event} onOpen={openEvent} />
                ))}
              </div>
            )
          ) : null}
        </div>

        <aside className="flex flex-col gap-10">
          <section>
            <h2 className="k-title-3">Infos pratiques</h2>
            <dl className="k-list mt-3">
              {association.address_text ? (
                <div className="flex items-start gap-3 py-3 first:pt-0">
                  <Icon name="mapPin" size={18} className="k-ink-tertiary mt-0.5" />
                  <div className="min-w-0">
                    <dt className="k-caption k-ink-tertiary">Adresse</dt>
                    <dd className="k-subhead k-ink break-words">
                      {association.address_text as string}
                    </dd>
                  </div>
                </div>
              ) : null}

              {association.contact_email ? (
                <div className="flex items-start gap-3 py-3 first:pt-0">
                  <Icon name="mail" size={18} className="k-ink-tertiary mt-0.5" />
                  <div className="min-w-0">
                    <dt className="k-caption k-ink-tertiary">E-mail</dt>
                    <dd className="k-subhead break-words">
                      <a
                        href={`mailto:${association.contact_email as string}`}
                        className="text-accent hover:underline"
                      >
                        {association.contact_email as string}
                      </a>
                    </dd>
                  </div>
                </div>
              ) : null}

              {association.contact_phone ? (
                <div className="flex items-start gap-3 py-3 first:pt-0">
                  <Icon name="phone" size={18} className="k-ink-tertiary mt-0.5" />
                  <div className="min-w-0">
                    <dt className="k-caption k-ink-tertiary">Téléphone</dt>
                    <dd className="k-subhead break-words">
                      <a
                        href={`tel:${association.contact_phone as string}`}
                        className="text-accent hover:underline"
                      >
                        {association.contact_phone as string}
                      </a>
                    </dd>
                  </div>
                </div>
              ) : null}

              {association.website_url ? (
                <div className="flex items-start gap-3 py-3 first:pt-0">
                  <Icon name="link" size={18} className="k-ink-tertiary mt-0.5" />
                  <div className="min-w-0">
                    <dt className="k-caption k-ink-tertiary">Site web</dt>
                    <dd className="k-subhead break-words">
                      <a
                        href={association.website_url as string}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-accent hover:underline"
                      >
                        Ouvrir le site
                        <Icon name="externalLink" size={15} />
                      </a>
                    </dd>
                  </div>
                </div>
              ) : null}

              <div className="flex items-start gap-3 py-3 first:pt-0">
                <Icon name="users" size={18} className="k-ink-tertiary mt-0.5" />
                <div className="min-w-0">
                  <dt className="k-caption k-ink-tertiary">Communauté</dt>
                  <dd className="k-subhead k-ink tabular-nums">{followersCount} abonné{followersCount > 1 ? 's' : ''}</dd>
                </div>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="k-title-3">Présence locale</h2>
            <p className="k-subhead k-ink-secondary mt-3">
              Cette association est rattachée au quartier {quartierName} et ses publications peuvent
              apparaître dans le fil local.
            </p>
            {association.quartier_id ? (
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => navigate(`/quartiers/${association.quartier_id}/associations`)}
                trailing={<Icon name="arrowRight" size={16} />}
              >
                Associations du quartier
              </Button>
            ) : null}
          </section>
        </aside>
      </div>
    </Page>
  );
}
