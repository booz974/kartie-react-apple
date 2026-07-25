import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Notice from '@/components/ui/Notice';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import Segmented from '@/components/ui/Segmented';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import CircleList from '@/features/social/components/CircleList';
import CreateCircleModal from '@/features/social/components/CreateCircleModal';
import type { CreatePostPayload } from '@/features/social/components/CreatePost';
import FeedPost from '@/features/social/components/FeedPost';
import CompleteProfileModal from '@/features/identity/CompleteProfileModal';

/** Defer CreatePost (+ Leaflet/ImageUploader) until an authenticated composer is shown — NFR-5 feed LCP. */
const CreatePost = lazy(() => import('@/features/social/components/CreatePost'));
import {
  socialKeys,
  useAddCommentMutation,
  useCircles,
  useCreateCircleMutation,
  useCreatePostMutation,
  useFeedPosts,
  useJoinCircleMutation,
  useToggleReactionMutation,
} from '@/queries/social';
import { useQuartier } from '@/queries/territory';
import { useAuthStore } from '@/stores/authStore';
import type { Circle, FeedPost as FeedPostType } from '@/lib/types/contract';

const tabs = [
  { value: 'all', label: 'Tout' },
  { value: 'village', label: 'Place du Village', icon: 'stadium' },
  { value: 'circles', label: 'Cercles', icon: 'users' },
] as const;

type TabId = (typeof tabs)[number]['value'];

function filterPosts(
  feed: FeedPostType[],
  activeTab: TabId,
  selectedCircle: Circle | null,
): FeedPostType[] {
  return feed.filter((post) => {
    if (selectedCircle) {
      return post.circle_id === selectedCircle.id;
    }
    if (activeTab === 'circles') return false;
    if (activeTab === 'village') {
      return (post.post_type as string | undefined) === 'village_square' || post.type === 'village_square';
    }
    if (post.circle_id) return false;
    return true;
  });
}

function getEmptyMessage(activeTab: TabId, selectedCircle: Circle | null): string {
  if (activeTab === 'village') return "Aucune discussion sur la Place du Village pour l'instant.";
  if (selectedCircle) return 'Aucun post dans ce cercle pour le moment.';
  return 'Soyez le premier à publier dans ce quartier !';
}

/** Le gabarit reprend la forme réelle d'une publication : rien ne saute au remplacement. */
function FeedSkeleton() {
  return (
    <div className="k-list" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex gap-3 py-6">
          <Skeleton width="2.5rem" height="2.5rem" radius="var(--k-radius-full)" />
          <div className="min-w-0 flex-1">
            <Skeleton width="9rem" height="0.9rem" />
            <Skeleton width="6rem" height="0.75rem" className="mt-2" />
            <SkeletonText lines={3} className="mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function QuartierFeedView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const quartierId = id ? Number(id) : undefined;
  const toast = useToast();

  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const [showCreateCircleModal, setShowCreateCircleModal] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const {
    data: quartier,
    isLoading: quartierLoading,
    isError: quartierError,
    refetch: refetchQuartier,
  } = useQuartier(quartierId);

  const { data: feed = [], isLoading: feedLoading } = useFeedPosts(quartierId);

  const { data: circles = [] } = useCircles(quartierId, session?.user.id);

  const createPostMutation = useCreatePostMutation(quartierId);
  const addCommentMutation = useAddCommentMutation(quartierId);
  const toggleReactionMutation = useToggleReactionMutation();
  const createCircleMutation = useCreateCircleMutation(quartierId, session?.user.id);
  const joinCircleMutation = useJoinCircleMutation(quartierId, session?.user.id);

  const isLoading = quartierLoading || feedLoading;
  const error = quartierError;

  const filteredPosts = useMemo(
    () => filterPosts(feed, activeTab, selectedCircle),
    [feed, activeTab, selectedCircle],
  );

  const showCreatePost = Boolean(session && (activeTab !== 'circles' || selectedCircle));

  const checkProfile = useCallback(() => {
    if (!profile) return false;
    if (!profile.first_name || !profile.last_name) {
      setShowCompleteProfileModal(true);
      return false;
    }
    return true;
  }, [profile]);

  const switchTab = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    setSelectedCircle(null);
  }, []);

  const handleCreateCircleClick = useCallback(() => {
    if (!session) return;
    setShowCreateCircleModal(true);
  }, [session]);

  const handleCreateCircleSubmit = useCallback(
    async ({ name, description, type }: { name: string; description: string; type: 'public' | 'private' }) => {
      if (!session?.user || !quartier) return;
      if (!checkProfile()) return;

      if (type === 'public' && !isAdmin) {
        toast.error(
          'Cercle public impossible',
          'Seuls les administrateurs peuvent créer des cercles publics.',
        );
        return;
      }

      const circleData = {
        quartier_id: quartier.id,
        name,
        description,
        type,
      };

      try {
        const { error: createError } = await createCircleMutation.mutateAsync({
          circleData,
          creatorId: session.user.id,
        });
        if (createError) {
          throw createError;
        }
        setShowCreateCircleModal(false);
        toast.success('Cercle créé', `« ${name} » est en ligne.`);
      } catch (err) {
        console.error('Erreur lors de la création du cercle:', err);
        const message = err instanceof Error ? err.message : String(err);
        toast.error('Création impossible', message);
      }
    },
    [checkProfile, createCircleMutation, isAdmin, quartier, session, toast],
  );

  const handleJoinCircle = useCallback(
    async (circle: Circle) => {
      if (!session?.user) {
        toast.info('Connexion requise', 'Connectez-vous pour rejoindre un cercle.');
        return;
      }
      if (!checkProfile()) return;

      try {
        const { success, error } = await joinCircleMutation.mutateAsync({
          circleId: circle.id,
          memberId: session.user.id,
        });
        if (success) {
          toast.success('Cercle rejoint', `Vous faites désormais partie de « ${circle.name} ».`);
        } else {
          console.error(error);
          toast.error('Impossible de rejoindre le cercle', 'Réessayez dans un instant.');
        }
      } catch (err) {
        console.error('Error joining circle:', err);
        toast.error('Impossible de rejoindre le cercle', 'Réessayez dans un instant.');
      }
    },
    [checkProfile, joinCircleMutation, session, toast],
  );

  const handleOpenCircle = useCallback((circle: Circle) => {
    setSelectedCircle(circle);
  }, []);

  const handleAddPost = useCallback(
    async (payload: CreatePostPayload) => {
      if (!checkProfile()) return;
      if (!session?.user || !profile || !quartier) return;

      const authorName =
        profile.first_name && profile.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile.username ?? 'Utilisateur';

      const avatarUrl =
        profile.avatar_url || `https://i.pravatar.cc/150?u=${session.user.id}`;

      const newPost: Record<string, unknown> = {
        content: payload.content,
        post_type: payload.post_type || 'regular',
        metadata: payload.metadata || {},
        circle_id: selectedCircle?.id ?? null,
        user_id: session.user.id,
        quartier_id: quartier.id,
        author: authorName,
        avatar: avatarUrl,
      };

      try {
        const { error: insertError } = await createPostMutation.mutateAsync(newPost);
        if (insertError) {
          throw insertError;
        }
      } catch (err) {
        console.error('Erreur lors de la publication du post:', err);
        const message = err instanceof Error ? err.message : String(err);
        toast.error('Publication impossible', message);
      }
    },
    [checkProfile, createPostMutation, profile, quartier, selectedCircle, session, toast],
  );

  const handleLike = useCallback(
    ({ postId, reactionType = 'like' }: { postId: number; reactionType?: string }) => {
      if (!session?.user || quartierId == null) return;

      queryClient.setQueryData<FeedPostType[]>(socialKeys.feed(quartierId), (old) => {
        if (!old) return old;
        return old.map((post) => {
          if (post.id !== postId) return post;
          const metadata = { ...(post.metadata ?? {}) };
          const reactions = {
            ...((metadata.reactions as Record<string, number> | undefined) ?? {}),
          };
          reactions[reactionType] = (reactions[reactionType] || 0) + 1;
          metadata.reactions = reactions;
          const updated: FeedPostType = { ...post, metadata };
          if (reactionType === 'like') {
            updated.likes = ((post.likes as number | undefined) || 0) + 1;
          }
          return updated;
        });
      });

      toggleReactionMutation.mutate(
        { postId, userId: session.user.id, reactionType },
        {
          onError: (err) => {
            console.error("Erreur lors de l'ajout de la réaction:", err);
          },
        },
      );
    },
    [queryClient, quartierId, session, toggleReactionMutation],
  );

  const handleComment = useCallback(
    ({
      postId,
      content,
      parent_id = null,
      image_url = null,
    }: {
      postId: number;
      content: string;
      parent_id?: number | null;
      image_url?: string | null;
    }) => {
      void (async () => {
        if (!checkProfile()) return;
        if (!session?.user) return;

        const dbData = {
          content,
          post_id: postId,
          parent_id,
          image_url,
          user_id: session.user.id,
        };

        try {
          const { error: commentError } = await addCommentMutation.mutateAsync(dbData);
          if (commentError) {
            throw commentError;
          }
        } catch (err) {
          console.error("Erreur lors de l'ajout du commentaire:", err);
          const message = err instanceof Error ? err.message : String(err);
          toast.error("Commentaire non publié", message);
        }
      })();
    },
    [addCommentMutation, checkProfile, session, toast],
  );

  if (isLoading) {
    return (
      <Page>
        <PageHeader eyebrow="Fil d’actualité" title="Chargement…" />
        <FeedSkeleton />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageHeader eyebrow="Fil d’actualité" title="Le fil n’a pas pu être chargé" />
        <Notice tone="danger">
          Impossible de charger le fil d’actualité. Vérifiez votre connexion, puis réessayez.
        </Notice>
        <div className="mt-4">
          <Button variant="primary" leading={<Icon name="refresh" size={17} />} onClick={() => void refetchQuartier()}>
            Réessayer
          </Button>
        </div>
      </Page>
    );
  }

  if (!quartier) {
    return (
      <Page>
        <PageHeader title="Quartier introuvable" />
        <EmptyState
          icon="map"
          title="Ce quartier n’existe pas"
          description="Le lien est peut-être erroné ou le quartier a été renommé."
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Retour à l’accueil
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <Page className="k-page--reading">
      {showCreateCircleModal ? (
        <CreateCircleModal
          isAdmin={isAdmin}
          isSubmitting={createCircleMutation.isPending}
          onCancel={() => setShowCreateCircleModal(false)}
          onSubmit={(data) => void handleCreateCircleSubmit(data)}
        />
      ) : null}

      {showCompleteProfileModal && session ? (
        <CompleteProfileModal
          session={session}
          initialData={profile ?? undefined}
          onCancel={() => setShowCompleteProfileModal(false)}
          onSaved={() => setShowCompleteProfileModal(false)}
        />
      ) : null}

      <PageHeader
        back={{ to: `/quartiers/${quartier.id}`, label: quartier.name }}
        eyebrow="Fil d’actualité"
        title={quartier.name}
        description="Ce qui se dit, s’organise et se signale dans le quartier."
      />

      <Segmented
        label="Filtrer le fil"
        className="mb-6"
        value={activeTab}
        onChange={switchTab}
        options={tabs}
      />

      {selectedCircle ? (
        <div className="k-hairline-all mb-6 flex flex-wrap items-start justify-between gap-3 rounded-lg p-4">
          <div className="min-w-0">
            <h2 className="k-title-3">{selectedCircle.name}</h2>
            {selectedCircle.description ? (
              <p className="k-subhead k-ink-secondary mt-1">
                {String(selectedCircle.description)}
              </p>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="ghost"
            leading={<Icon name="chevronLeft" size={16} />}
            onClick={() => setSelectedCircle(null)}
          >
            Tous les cercles
          </Button>
        </div>
      ) : null}

      {showCreatePost ? (
        <Section className="mb-8">
          <Suspense fallback={<Skeleton height="12rem" radius="var(--k-radius-lg)" />}>
            <CreatePost
              quartier={quartier}
              onSubmit={(payload) => void handleAddPost(payload)}
              isSubmitting={createPostMutation.isPending}
            />
          </Suspense>
        </Section>
      ) : null}

      {activeTab === 'circles' && !selectedCircle ? (
        <Section
          title="Cercles de voisins"
          description="Des espaces plus petits, autour d’un sujet commun."
          action={
            session ? (
              <Button
                size="sm"
                variant="tinted"
                leading={<Icon name="plus" size={16} />}
                onClick={handleCreateCircleClick}
              >
                Créer un cercle
              </Button>
            ) : null
          }
        >
          <CircleList
            circles={circles}
            onJoinCircle={(circle) => void handleJoinCircle(circle)}
            onOpenCircle={handleOpenCircle}
            onCreateCircle={handleCreateCircleClick}
          />
        </Section>
      ) : (
        <section id="posts-container" aria-label="Publications">
          {filteredPosts.length > 0 ? (
            <div className="k-list">
              {filteredPosts.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
                  session={session}
                  onReact={handleLike}
                  onComment={handleComment}
                  isCommentSubmitting={addCommentMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="chatLines"
              title="Rien à lire pour le moment"
              description={getEmptyMessage(activeTab, selectedCircle)}
              action={
                session && showCreatePost ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      document
                        .getElementById('create-post-title')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    Publier le premier message
                  </Button>
                ) : null
              }
            />
          )}
        </section>
      )}
    </Page>
  );
}
