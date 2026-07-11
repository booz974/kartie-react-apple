import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import AssociationEventCard from '@/features/associations/components/AssociationEventCard';
import AssociationFollowButton from '@/features/associations/components/AssociationFollowButton';
import AssociationHeader from '@/features/associations/components/AssociationHeader';
import { useAssociation } from '@/queries/associations';
import { useAuthStore } from '@/stores/authStore';
import type { AssociationEvent } from '@/lib/types/contract';

const TABS = [
  { id: 'about', label: 'À propos' },
  { id: 'posts', label: 'Publications' },
  { id: 'events', label: 'Événements' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AssociationView() {
  const navigate = useNavigate();
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
    alert('Connectez-vous pour suivre cette association.');
  }

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        <p className="text-xl font-semibold text-slate-700">Chargement de l'association...</p>
      </div>
    );
  }

  if (isNotFound || !association) {
    return (
      <div className="p-10 text-center">
        <p className="text-xl font-semibold text-slate-700">Association introuvable.</p>
      </div>
    );
  }

  const followersCount = Math.max(0, (association.followers_count || 0) + followersDelta);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-2.5 text-sm font-bold text-slate-800 shadow transition hover:bg-white"
        >
          Retour
        </button>

        {canManage ? (
          <button
            type="button"
            onClick={() => navigate(`/associations/${association.id}/dashboard`)}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Gérer l'association
          </button>
        ) : null}
      </div>

      <AssociationHeader
        association={association}
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-bold transition',
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'about' ? (
              <div className="space-y-5">
                {association.full_description ? (
                  <div>
                    <h2 className="mb-2 text-xl font-black text-slate-900">À propos</h2>
                    <p className="whitespace-pre-line text-slate-700">
                      {association.full_description as string}
                    </p>
                  </div>
                ) : null}
                {association.mission ? (
                  <div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900">Mission</h3>
                    <p className="whitespace-pre-line text-slate-700">
                      {association.mission as string}
                    </p>
                  </div>
                ) : null}
                {Array.isArray(association.activities) && association.activities.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900">Activités</h3>
                    <div className="flex flex-wrap gap-2">
                      {association.activities.map((activity) => (
                        <span
                          key={String(activity)}
                          className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700"
                        >
                          {String(activity)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {Array.isArray(association.audiences) && association.audiences.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900">Publics concernés</h3>
                    <div className="flex flex-wrap gap-2">
                      {association.audiences.map((audience) => (
                        <span
                          key={String(audience)}
                          className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700"
                        >
                          {String(audience)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'posts' ? (
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
                    Aucune publication pour le moment.
                  </div>
                ) : (
                  posts.map((post) => (
                    <article key={post.id} className="rounded-2xl border border-slate-200 p-5">
                      {post.title ? (
                        <p className="mb-2 text-lg font-bold text-slate-900">{post.title}</p>
                      ) : null}
                      <p className="mb-3 whitespace-pre-line text-slate-700">
                        {post.content as string}
                      </p>
                      {post.image_url ? (
                        <img
                          src={post.image_url}
                          alt={post.title || association.name}
                          className="max-h-80 w-full rounded-2xl object-cover"
                        />
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            ) : null}

            {activeTab === 'events' ? (
              <div className="space-y-4">
                {events.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
                    Aucun événement publié.
                  </div>
                ) : (
                  events.map((event) => (
                    <AssociationEventCard key={event.id} event={event} onOpen={openEvent} />
                  ))
                )}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-black text-slate-900">Infos pratiques</h2>
            <div className="space-y-3 text-sm text-slate-700">
              {association.address_text ? <p>{association.address_text as string}</p> : null}
              {association.contact_email ? <p>{association.contact_email as string}</p> : null}
              {association.contact_phone ? <p>{association.contact_phone as string}</p> : null}
              {association.website_url ? (
                <p>
                  <a
                    href={association.website_url as string}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    Site web
                  </a>
                </p>
              ) : null}
              <p>{followersCount} abonné(s)</p>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-black text-slate-900">Présence locale</h2>
            <p className="text-sm leading-relaxed text-slate-700">
              Cette association est rattachée au quartier {quartierName} et ses publications peuvent
              apparaître dans le fil local.
            </p>
            {association.quartier_id ? (
              <button
                type="button"
                onClick={() => navigate(`/quartiers/${association.quartier_id}/associations`)}
                className="mt-4 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Voir toutes les associations du quartier
              </button>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
