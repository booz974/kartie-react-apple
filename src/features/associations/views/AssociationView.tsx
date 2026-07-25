import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import { Page } from '@/components/ui/Page';
import Segmented from '@/components/ui/Segmented';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import AssociationEventCard from '@/features/associations/components/AssociationEventCard';
import { associationCategoryStyle } from '@/features/associations/components/AssociationCard';
import AssociationFollowButton from '@/features/associations/components/AssociationFollowButton';
import AssociationHeader from '@/features/associations/components/AssociationHeader';
import { useAssociation } from '@/queries/associations';
import { useAuthStore } from '@/stores/authStore';
import type { CategoryKey } from '@/design/categories';
import type { AssociationEvent } from '@/lib/types/contract';

const TABS = [
  { value: 'about', label: 'À propos' },
  { value: 'posts', label: 'Publications' },
  { value: 'events', label: 'Événements' },
] as const;

type TabId = (typeof TABS)[number]['value'];

type SectionTone = CategoryKey | 'accent' | 'warm';

/** Titre de section porté par une pastille colorée plutôt que par un filet gris. */
function SectionTitle({
  emoji,
  tone,
  children,
}: {
  emoji: string;
  tone: SectionTone;
  children: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Chip tone={tone} size={34}>
        {emoji}
      </Chip>
      <h2 className="k-title-3">{children}</h2>
    </div>
  );
}

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

  // Les compteurs vivent sur les onglets : on sait ce qu'on va trouver avant
  // d'y aller.
  const tabOptions = useMemo(
    () => [
      { value: 'about' as const, label: TABS[0].label },
      { value: 'posts' as const, label: TABS[1].label, count: posts.length },
      { value: 'events' as const, label: TABS[2].label, count: events.length },
    ],
    [posts.length, events.length],
  );

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
          <Skeleton height="11rem" radius="var(--k-radius-2xl)" />
          <div className="flex items-start gap-4">
            <Skeleton width="5.5rem" height="5.5rem" radius="var(--k-radius-xl)" />
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
  const style = associationCategoryStyle(
    association.category as string | null | undefined,
    association.category_label,
  );

  return (
    <Page className="pt-6 md:pt-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <Segmented
            label="Contenus de l’association"
            value={activeTab}
            onChange={setActiveTab}
            options={tabOptions}
            className="mb-7"
          />

          {activeTab === 'about' ? (
            <div className="flex flex-col gap-8">
              {association.full_description ? (
                <section className="k-card p-5 md:p-6">
                  <SectionTitle emoji="📖" tone={style.tone}>
                    À propos
                  </SectionTitle>
                  <p className="k-body k-ink-secondary k-measure mt-4 whitespace-pre-line">
                    {association.full_description as string}
                  </p>
                </section>
              ) : null}

              {association.mission ? (
                <section className="k-card p-5 md:p-6">
                  <SectionTitle emoji="🎯" tone="warm">
                    Mission
                  </SectionTitle>
                  <p className="k-body k-ink-secondary k-measure mt-4 whitespace-pre-line">
                    {association.mission as string}
                  </p>
                </section>
              ) : null}

              {activities.length > 0 ? (
                <section>
                  <SectionTitle emoji="🎪" tone="event">
                    Activités
                  </SectionTitle>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {activities.map((activity) => (
                      <li key={String(activity)}>
                        <Badge tone="event" size="lg" emoji="✨">
                          {String(activity)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {audiences.length > 0 ? (
                <section>
                  <SectionTitle emoji="🧑‍🤝‍🧑" tone="quartier">
                    Publics concernés
                  </SectionTitle>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {audiences.map((audience) => (
                      <li key={String(audience)}>
                        <Badge tone="quartier" size="lg">
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
              <div className="flex flex-col gap-5">
                {posts.map((post) => (
                  <article key={post.id} className="k-card overflow-hidden p-0">
                    {post.image_url ? (
                      <Media
                        src={post.image_url}
                        alt={post.title || association.name}
                        category="news"
                        emoji="📣"
                        ratio="16 / 9"
                        veil={false}
                      />
                    ) : null}

                    <div className="flex flex-col gap-3 p-5">
                      <div className="flex items-center gap-3">
                        <Chip tone={style.tone} size={38}>
                          {style.emoji}
                        </Chip>
                        <div className="min-w-0">
                          <p className="k-footnote k-ink-tertiary">{association.name}</p>
                          {post.title ? <h2 className="k-title-3">{post.title}</h2> : null}
                        </div>
                      </div>

                      <p className="k-body k-ink-secondary k-measure whitespace-pre-line">
                        {post.content as string}
                      </p>
                    </div>
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
              <div className="k-grid k-grid--wide">
                {events.map((event) => (
                  <AssociationEventCard key={event.id} event={event} onOpen={openEvent} />
                ))}
              </div>
            )
          ) : null}
        </div>

        <aside className="flex flex-col gap-8">
          <section className="k-card p-5 md:p-6">
            <SectionTitle emoji="📇" tone="accent">
              Infos pratiques
            </SectionTitle>
            <dl className="k-list mt-4">
              {association.address_text ? (
                <div className="flex items-start gap-3 py-3 first:pt-0">
                  <Chip tone="quartier" size={34}>
                    📍
                  </Chip>
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
                  <Chip tone="news" size={34}>
                    ✉️
                  </Chip>
                  <div className="min-w-0">
                    <dt className="k-caption k-ink-tertiary">E-mail</dt>
                    <dd className="k-subhead break-words">
                      <a
                        href={`mailto:${association.contact_email as string}`}
                        className="text-accent-ink font-medium hover:underline"
                      >
                        {association.contact_email as string}
                      </a>
                    </dd>
                  </div>
                </div>
              ) : null}

              {association.contact_phone ? (
                <div className="flex items-start gap-3 py-3 first:pt-0">
                  <Chip tone="asso" size={34}>
                    ☎️
                  </Chip>
                  <div className="min-w-0">
                    <dt className="k-caption k-ink-tertiary">Téléphone</dt>
                    <dd className="k-subhead break-words">
                      <a
                        href={`tel:${association.contact_phone as string}`}
                        className="text-accent-ink font-medium hover:underline"
                      >
                        {association.contact_phone as string}
                      </a>
                    </dd>
                  </div>
                </div>
              ) : null}

              {association.website_url ? (
                <div className="flex items-start gap-3 py-3 first:pt-0">
                  <Chip tone="project" size={34}>
                    🔗
                  </Chip>
                  <div className="min-w-0">
                    <dt className="k-caption k-ink-tertiary">Site web</dt>
                    <dd className="k-subhead break-words">
                      <a
                        href={association.website_url as string}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent-ink inline-flex items-center gap-1.5 font-medium hover:underline"
                      >
                        Ouvrir le site
                        <Icon name="externalLink" size={15} />
                      </a>
                    </dd>
                  </div>
                </div>
              ) : null}

              <div className="flex items-start gap-3 py-3 first:pt-0">
                <Chip tone="warm" size={34}>
                  👥
                </Chip>
                <div className="min-w-0">
                  <dt className="k-caption k-ink-tertiary">Communauté</dt>
                  <dd className="k-subhead k-ink tabular-nums">
                    {followersCount} abonné{followersCount > 1 ? 's' : ''}
                  </dd>
                </div>
              </div>
            </dl>
          </section>

          <section className="k-card overflow-hidden p-0">
            <div className="k-banner--accent flex items-center gap-3 px-5 py-4">
              <span aria-hidden="true" className="text-2xl leading-none">
                🏘️
              </span>
              <h2 className="k-title-3">Présence locale</h2>
            </div>
            <div className="p-5">
              <p className="k-subhead k-ink-secondary">
                Cette association est rattachée au quartier {quartierName} et ses publications
                peuvent apparaître dans le fil local.
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
            </div>
          </section>
        </aside>
      </div>
    </Page>
  );
}
