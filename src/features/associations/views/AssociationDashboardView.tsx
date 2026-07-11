import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  createAssociationEvent,
  createAssociationPost,
  getAssociationDashboardData,
  logModerationAction,
  removeAssociationEvent,
  removeAssociationPost,
  updateAssociation,
  updateAssociationEvent,
  updateAssociationPost,
} from '@/api/associations';
import AssociationEventCard from '@/features/associations/components/AssociationEventCard';
import AssociationEventForm, {
  type AssociationEventFormPayload,
} from '@/features/associations/components/AssociationEventForm';
import AssociationForm, {
  type AssociationFormPayload,
} from '@/features/associations/components/AssociationForm';
import AssociationPostComposer, {
  type AssociationPostFormPayload,
} from '@/features/associations/components/AssociationPostComposer';
import { associationKeys } from '@/queries/associations';
import { socialKeys } from '@/queries/social';
import { useAuthStore } from '@/stores/authStore';
import type {
  Association,
  AssociationEvent,
  AssociationMembership,
  AssociationPost,
} from '@/lib/types/contract';

type DashboardTab = 'profile' | 'posts' | 'events';

const tabs: { id: DashboardTab; label: string }[] = [
  { id: 'profile', label: 'Fiche' },
  { id: 'posts', label: 'Posts' },
  { id: 'events', label: 'Événements' },
];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String((error as { message?: string })?.message || error);
}

export default function AssociationDashboardView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  const [association, setAssociation] = useState<Association | null>(null);
  const [posts, setPosts] = useState<AssociationPost[]>([]);
  const [events, setEvents] = useState<AssociationEvent[]>([]);
  const [membership, setMembership] = useState<AssociationMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('profile');
  const [editingPost, setEditingPost] = useState<AssociationPost | null>(null);
  const [editingEvent, setEditingEvent] = useState<AssociationEvent | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!id || !session?.user) {
      setIsLoading(false);
      setAssociation(null);
      return;
    }

    setIsLoading(true);
    const dashboard = await getAssociationDashboardData(id, session.user.id);

    let nextAssociation = dashboard.association;
    if (!dashboard.membership && profile?.role !== 'admin') {
      nextAssociation = null;
    }

    setAssociation(nextAssociation);
    setPosts(dashboard.posts);
    setEvents(dashboard.events);
    setMembership(dashboard.membership);
    setIsLoading(false);
  }, [id, session?.user, profile?.role]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    setEditingPost(null);
    setEditingEvent(null);
  }, [activeTab]);

  async function invalidateContentRelatedQueries(
    associationId: number,
    quartierId?: number | null,
  ) {
    await queryClient.invalidateQueries({ queryKey: ['association'] });
    await queryClient.invalidateQueries({
      queryKey: associationKeys.dashboard(associationId, session?.user?.id ?? ''),
    });
    if (quartierId != null) {
      await queryClient.invalidateQueries({ queryKey: socialKeys.feed(quartierId) });
    }
  }

  async function handleUpdateAssociation(payload: AssociationFormPayload) {
    if (!association) return;

    const previousStatus = association.status;
    const result = await updateAssociation(association.id, { ...payload });

    if (!result.success) {
      alert(`Impossible de mettre à jour la fiche : ${errorMessage(result.error)}`);
      return;
    }

    setAssociation({
      ...association,
      ...result.data,
    });

    if (profile?.role === 'admin' && previousStatus !== payload.status) {
      await logModerationAction({
        entityType: 'association',
        entityId: association.id,
        action: `status:${payload.status}`,
        performedBy: session?.user?.id,
      });
    }

    await queryClient.invalidateQueries({ queryKey: ['association'] });
    await queryClient.invalidateQueries({
      queryKey: associationKeys.dashboard(association.id, session?.user?.id ?? ''),
    });
    await queryClient.invalidateQueries({ queryKey: associationKeys.adminReview() });
  }

  async function handleSavePost(payload: AssociationPostFormPayload) {
    if (!association || !session?.user) return;

    const request = editingPost
      ? updateAssociationPost(editingPost.id, payload, session.user.id)
      : createAssociationPost(
          {
            ...payload,
            association_id: association.id,
            quartier_id: association.quartier_id as number,
            metadata: payload.image_url ? { image_url: payload.image_url } : {},
          },
          session.user.id,
        );

    const result = await request;

    if (!result.success) {
      alert(`Impossible d'enregistrer le post : ${errorMessage(result.error)}`);
      return;
    }

    setEditingPost(null);
    await loadDashboard();
    setActiveTab('posts');
    await invalidateContentRelatedQueries(association.id, association.quartier_id as number | null);
  }

  async function handleRemovePost(post: AssociationPost) {
    if (!session?.user || !association) return;

    const result = await removeAssociationPost(post.id, session.user.id);
    if (!result.success) {
      alert(`Impossible de retirer le post : ${errorMessage(result.error)}`);
      return;
    }

    setEditingPost(null);
    await loadDashboard();
    await invalidateContentRelatedQueries(association.id, association.quartier_id as number | null);
  }

  async function handleSaveEvent(payload: AssociationEventFormPayload) {
    if (!association || !session?.user) return;
    if (!payload.start_at) {
      alert("Impossible d'enregistrer l'événement : date de début requise");
      return;
    }

    const request = editingEvent
      ? updateAssociationEvent(editingEvent.id, payload, session.user.id)
      : createAssociationEvent(
          {
            ...payload,
            start_at: payload.start_at,
            association_id: association.id,
            quartier_id: association.quartier_id as number,
          },
          session.user.id,
        );

    const result = await request;

    if (!result.success) {
      alert(`Impossible d'enregistrer l'événement : ${errorMessage(result.error)}`);
      return;
    }

    setEditingEvent(null);
    await loadDashboard();
    setActiveTab('events');
    await invalidateContentRelatedQueries(association.id, association.quartier_id as number | null);
  }

  async function handleRemoveEvent(event: AssociationEvent) {
    if (!session?.user || !association) return;

    const result = await removeAssociationEvent(event.id, session.user.id);
    if (!result.success) {
      alert(`Impossible de retirer l'événement : ${errorMessage(result.error)}`);
      return;
    }

    setEditingEvent(null);
    await loadDashboard();
    await invalidateContentRelatedQueries(association.id, association.quartier_id as number | null);
  }

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        <p className="text-xl font-semibold text-slate-700">Chargement du dashboard...</p>
      </div>
    );
  }

  if (!association) {
    return (
      <div className="space-y-4 p-10 text-center">
        <p className="text-xl font-semibold text-slate-700">Accès impossible à ce dashboard.</p>
        <p className="text-sm text-slate-500">
          Vous n&apos;êtes pas membre de cette association, ou l&apos;association n&apos;existe pas.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-slate-800"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(`/associations/${association.id}`)}
          className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-2.5 text-sm font-bold text-slate-800 shadow transition hover:bg-white"
        >
          Retour à la page publique
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-slate-700 shadow">
            {association.followers_count || 0} abonné(s)
          </span>
          <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            {association.status_label}
          </span>
          {membership?.role ? (
            <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-slate-700 shadow">
              Rôle : {membership.role}
            </span>
          ) : null}
        </div>
      </div>

      <section className="desktop-glass-card mb-8 rounded-[2rem] p-6 md:p-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
          Dashboard {association.name}
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-700 md:text-lg">
          Gérez la fiche, les publications et les événements de votre association sans quitter
          Kartie.
        </p>
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'rounded-full px-4 py-2 text-sm font-bold transition',
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white/70 text-slate-700 hover:bg-white',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' ? (
        <AssociationForm
          modelValue={association}
          allowModerationFields={profile?.role === 'admin'}
          submitLabel="Mettre à jour la fiche"
          onSubmit={handleUpdateAssociation}
        />
      ) : null}

      {activeTab === 'posts' ? (
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <AssociationPostComposer
            modelValue={editingPost}
            submitLabel={editingPost ? 'Mettre à jour le post' : 'Créer un post'}
            onSubmit={handleSavePost}
          />

          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-black text-slate-900">Publications</h2>
            {posts.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
                Aucun post enregistré.
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        {post.title ? (
                          <p className="font-bold text-slate-900">{post.title}</p>
                        ) : null}
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {post.status}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPost(post)}
                          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemovePost(post)}
                          className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-200"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-line text-sm text-slate-700">
                      {String(post.content || '')}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === 'events' ? (
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <AssociationEventForm
            modelValue={editingEvent}
            submitLabel={
              editingEvent ? 'Mettre à jour l’événement' : 'Créer un événement'
            }
            onSubmit={handleSaveEvent}
          />

          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-black text-slate-900">Événements</h2>
            {events.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
                Aucun événement enregistré.
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <AssociationEventCard
                    key={event.id}
                    event={event}
                    canEdit
                    onOpen={(item) =>
                      navigate(item.routePath || `/associations/events/${item.id}`)
                    }
                    onEdit={(item) => setEditingEvent(item)}
                  />
                ))}
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={() => void handleRemoveEvent(editingEvent)}
                    className="rounded-full bg-rose-100 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-200"
                  >
                    Retirer l’événement en cours d’édition
                  </button>
                ) : null}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
