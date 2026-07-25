import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  ASSOCIATION_POST_STATUS_OPTIONS,
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
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Notice from '@/components/ui/Notice';
import { Page, PageHeader } from '@/components/ui/Page';
import Segmented from '@/components/ui/Segmented';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
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

const tabs = [
  { value: 'profile' as const, label: 'Fiche', icon: 'document' as const },
  { value: 'posts' as const, label: 'Posts', icon: 'megaphone' as const },
  { value: 'events' as const, label: 'Événements', icon: 'calendar' as const },
];

const POST_STATUS_TONES: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  draft: 'warning',
  published: 'success',
  archived: 'neutral',
  removed: 'danger',
};

function postStatusLabel(status: string): string {
  return ASSOCIATION_POST_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String((error as { message?: string })?.message || error);
}

export default function AssociationDashboardView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
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

  // États d'action : ce qui est en cours doit se voir sur le bouton qui l'a
  // déclenché, pas seulement dans une notification à la fin.
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [removingPostId, setRemovingPostId] = useState<number | null>(null);
  const [isRemovingEvent, setIsRemovingEvent] = useState(false);

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

    setIsSavingProfile(true);
    const previousStatus = association.status;
    const result = await updateAssociation(association.id, { ...payload });

    if (!result.success) {
      setIsSavingProfile(false);
      toast.error('Impossible de mettre à jour la fiche', errorMessage(result.error));
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
    setIsSavingProfile(false);
    toast.success('Fiche mise à jour');
  }

  async function handleSavePost(payload: AssociationPostFormPayload) {
    if (!association || !session?.user) return;

    setIsSavingPost(true);
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
      setIsSavingPost(false);
      toast.error("Impossible d'enregistrer le post", errorMessage(result.error));
      return;
    }

    const wasEditing = Boolean(editingPost);
    setEditingPost(null);
    await loadDashboard();
    setActiveTab('posts');
    await invalidateContentRelatedQueries(association.id, association.quartier_id as number | null);
    setIsSavingPost(false);
    toast.success(wasEditing ? 'Post mis à jour' : 'Post enregistré');
  }

  async function handleRemovePost(post: AssociationPost) {
    if (!session?.user || !association) return;

    const confirmed = await confirm({
      title: 'Retirer ce post ?',
      message: 'Il ne sera plus visible sur la page de l’association ni dans le fil du quartier.',
      confirmLabel: 'Retirer',
      tone: 'danger',
    });
    if (!confirmed) return;

    setRemovingPostId(post.id);
    const result = await removeAssociationPost(post.id, session.user.id);
    if (!result.success) {
      setRemovingPostId(null);
      toast.error('Impossible de retirer le post', errorMessage(result.error));
      return;
    }

    setEditingPost(null);
    await loadDashboard();
    await invalidateContentRelatedQueries(association.id, association.quartier_id as number | null);
    setRemovingPostId(null);
    toast.success('Post retiré');
  }

  async function handleSaveEvent(payload: AssociationEventFormPayload) {
    if (!association || !session?.user) return;
    if (!payload.start_at) {
      toast.error("Impossible d'enregistrer l'événement", 'La date de début est requise.');
      return;
    }

    setIsSavingEvent(true);
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
      setIsSavingEvent(false);
      toast.error("Impossible d'enregistrer l'événement", errorMessage(result.error));
      return;
    }

    const wasEditing = Boolean(editingEvent);
    setEditingEvent(null);
    await loadDashboard();
    setActiveTab('events');
    await invalidateContentRelatedQueries(association.id, association.quartier_id as number | null);
    setIsSavingEvent(false);
    toast.success(wasEditing ? 'Événement mis à jour' : 'Événement enregistré');
  }

  async function handleRemoveEvent(event: AssociationEvent) {
    if (!session?.user || !association) return;

    const confirmed = await confirm({
      title: 'Retirer cet événement ?',
      message: `« ${event.title} » ne sera plus visible dans l’agenda du quartier.`,
      confirmLabel: 'Retirer',
      tone: 'danger',
    });
    if (!confirmed) return;

    setIsRemovingEvent(true);
    const result = await removeAssociationEvent(event.id, session.user.id);
    if (!result.success) {
      setIsRemovingEvent(false);
      toast.error("Impossible de retirer l'événement", errorMessage(result.error));
      return;
    }

    setEditingEvent(null);
    await loadDashboard();
    await invalidateContentRelatedQueries(association.id, association.quartier_id as number | null);
    setIsRemovingEvent(false);
    toast.success('Événement retiré');
  }

  if (isLoading) {
    return (
      <Page className="pt-6 md:pt-10">
        <Skeleton height="1rem" width="9rem" />
        <Skeleton height="2.5rem" width="60%" className="mt-3" />
        <Skeleton height="1rem" width="80%" className="mt-3" />
        <Skeleton height="2.5rem" width="18rem" radius="var(--k-radius-md)" className="mt-8" />
        <SkeletonText lines={6} className="mt-8" />
      </Page>
    );
  }

  if (!association) {
    return (
      <Page className="pt-6 md:pt-10">
        <h1 className="k-visually-hidden">Accès impossible à ce tableau de bord</h1>
        <EmptyState
          icon="lock"
          title="Accès impossible à ce tableau de bord"
          description="Vous n’êtes pas membre de cette association, ou l’association n’existe pas."
          action={
            <Button variant="primary" onClick={() => navigate(-1)}>
              Revenir en arrière
            </Button>
          }
        />
      </Page>
    );
  }

  const quartierId = association.quartier_id as number | null | undefined;

  return (
    <Page className="pt-6 md:pt-10">
      <PageHeader
        back={{ to: `/associations/${association.id}`, label: 'Retour à la page publique' }}
        eyebrow="Espace de gestion"
        title={association.name}
        description="Gérez la fiche, les publications et les événements de votre association sans quitter Kartie."
        meta={
          <>
            {association.status_label ? (
              <Badge tone={association.is_publicly_visible ? 'success' : 'warning'} dot>
                {association.status_label}
              </Badge>
            ) : null}
            <Badge icon="users">{association.followers_count || 0} abonné(s)</Badge>
            {membership?.role ? <Badge icon="user">Rôle : {membership.role}</Badge> : null}
          </>
        }
      />

      <Segmented
        label="Sections du tableau de bord"
        value={activeTab}
        onChange={setActiveTab}
        options={tabs}
        className="mb-8"
      />

      {activeTab === 'profile' ? (
        <AssociationForm
          modelValue={association}
          allowModerationFields={profile?.role === 'admin'}
          submitLabel="Mettre à jour la fiche"
          submitting={isSavingProfile}
          onSubmit={handleUpdateAssociation}
        />
      ) : null}

      {activeTab === 'posts' ? (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <AssociationPostComposer
            modelValue={editingPost}
            submitLabel={editingPost ? 'Mettre à jour le post' : 'Créer un post'}
            submitting={isSavingPost}
            showCancel={Boolean(editingPost)}
            onCancel={() => setEditingPost(null)}
            onSubmit={handleSavePost}
          />

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="k-title-3">Publications</h2>
              <span className="k-footnote k-ink-tertiary tabular-nums">{posts.length}</span>
            </div>

            {posts.length === 0 ? (
              <EmptyState
                icon="megaphone"
                title="Aucun post enregistré"
                description="Rédigez votre première publication : elle apparaîtra sur la page de l’association et dans le fil du quartier."
              />
            ) : (
              <div className="k-list">
                {posts.map((post) => {
                  const isEditing = editingPost?.id === post.id;
                  return (
                    <article key={post.id} className="py-5 first:pt-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {post.title ? (
                            <h3 className="k-callout font-semibold">{post.title}</h3>
                          ) : null}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge tone={POST_STATUS_TONES[post.status] ?? 'neutral'}>
                              {postStatusLabel(post.status)}
                            </Badge>
                            {isEditing ? (
                              <Badge tone="accent" icon="pencil">
                                En cours d’édition
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPost(post)}
                            leading={<Icon name="pencil" size={15} />}
                          >
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="danger-tinted"
                            loading={removingPostId === post.id}
                            onClick={() => void handleRemovePost(post)}
                            leading={<Icon name="trash" size={15} />}
                          >
                            Retirer
                          </Button>
                        </div>
                      </div>

                      <p className="k-subhead k-ink-secondary mt-2 line-clamp-3 whitespace-pre-line">
                        {String(post.content || '')}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === 'events' ? (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <AssociationEventForm
            modelValue={editingEvent}
            submitLabel={editingEvent ? 'Mettre à jour l’événement' : 'Créer un événement'}
            submitting={isSavingEvent}
            showCancel={Boolean(editingEvent)}
            onCancel={() => setEditingEvent(null)}
            onSubmit={handleSaveEvent}
          />

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="k-title-3">Événements</h2>
              <span className="k-footnote k-ink-tertiary tabular-nums">{events.length}</span>
            </div>

            {editingEvent ? (
              <Notice tone="info" className="mb-4">
                <p className="k-subhead">
                  Vous modifiez « {editingEvent.title} » dans le formulaire.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditingEvent(null)}>
                    Annuler l’édition
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-tinted"
                    loading={isRemovingEvent}
                    onClick={() => void handleRemoveEvent(editingEvent)}
                    leading={<Icon name="trash" size={15} />}
                  >
                    Retirer l’événement
                  </Button>
                </div>
              </Notice>
            ) : null}

            {events.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="Aucun événement enregistré"
                description="Programmez un événement : il apparaîtra sur la page de l’association et dans l’agenda du quartier."
              />
            ) : (
              <div className="k-grid">
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
              </div>
            )}
          </section>
        </div>
      ) : null}

      {quartierId != null ? (
        <p className="k-footnote k-ink-tertiary k-hairline-top mt-14 pt-6">
          Les contenus publiés ici alimentent aussi le fil du quartier.
        </p>
      ) : null}
    </Page>
  );
}
