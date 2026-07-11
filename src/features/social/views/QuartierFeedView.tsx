import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
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
  { id: 'all', label: 'Tout' },
  { id: 'village', label: '🏟️ Place du Village' },
  { id: 'circles', label: '👥 Cercles' },
] as const;

type TabId = (typeof tabs)[number]['id'];

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

export default function QuartierFeedView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const quartierId = id ? Number(id) : undefined;

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
        window.alert('Seuls les administrateurs peuvent créer des cercles publics.');
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
      } catch (err) {
        console.error('Erreur lors de la création du cercle:', err);
        const message = err instanceof Error ? err.message : String(err);
        window.alert(`Erreur lors de la création du cercle: ${message}`);
      }
    },
    [checkProfile, createCircleMutation, isAdmin, quartier, session],
  );

  const handleJoinCircle = useCallback(
    async (circle: Circle) => {
      if (!session?.user) {
        window.alert('Connectez-vous pour rejoindre un cercle.');
        return;
      }
      if (!checkProfile()) return;

      try {
        const { success, error } = await joinCircleMutation.mutateAsync({
          circleId: circle.id,
          memberId: session.user.id,
        });
        if (success) {
          window.alert(`Vous avez rejoint le cercle ${circle.name} !`);
        } else {
          console.error(error);
          window.alert('Impossible de rejoindre le cercle.');
        }
      } catch (err) {
        console.error('Error joining circle:', err);
        window.alert('Impossible de rejoindre le cercle.');
      }
    },
    [checkProfile, joinCircleMutation, session],
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
        window.alert(`Erreur lors de la publication : ${message}`);
      }
    },
    [checkProfile, createPostMutation, profile, quartier, selectedCircle, session],
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
          window.alert(`Erreur lors de l'ajout du commentaire : ${message}`);
        }
      })();
    },
    [addCommentMutation, checkProfile, session],
  );

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        <p className="text-xl font-semibold text-gray-700">Chargement du fil d&apos;actualité...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500 font-bold">Erreur : Impossible de charger le fil d&apos;actualité.</p>
        <button
          type="button"
          onClick={() => refetchQuartier()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!quartier) {
    return (
      <div className="p-10 text-center">
        <p>Quartier introuvable.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-lg max-w-4xl mx-auto">
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

      <button
        type="button"
        onClick={() => navigate(`/quartiers/${quartier.id}`)}
        className="mb-8 inline-flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-full transition hover:bg-gray-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Retour au quartier {quartier.name}
      </button>

      <h2 className="text-3xl font-bold text-center mb-6">Fil d&apos;actualité de {quartier.name}</h2>

      <div className="flex space-x-4 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            className={`py-2 px-4 font-medium text-sm focus:outline-none transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {selectedCircle ? (
        <div className="mb-6 bg-blue-50 p-4 rounded-lg flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-blue-900">{selectedCircle.name}</h3>
            <p className="text-blue-700">{String(selectedCircle.description ?? '')}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedCircle(null)}
            className="text-blue-600 underline text-sm"
          >
            Retour à la liste des cercles
          </button>
        </div>
      ) : null}

      {showCreatePost ? (
        <Suspense fallback={null}>
          <CreatePost
            quartier={quartier}
            onSubmit={(payload) => void handleAddPost(payload)}
            isSubmitting={createPostMutation.isPending}
          />
        </Suspense>
      ) : null}

      {activeTab === 'circles' && !selectedCircle ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Cercles de Voisins</h3>
            {session ? (
              <button
                type="button"
                onClick={handleCreateCircleClick}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                + Créer un cercle
              </button>
            ) : null}
          </div>
          <CircleList
            circles={circles}
            onJoinCircle={(circle) => void handleJoinCircle(circle)}
            onOpenCircle={handleOpenCircle}
            onCreateCircle={handleCreateCircleClick}
          />
        </div>
      ) : (
        <div id="posts-container" className="space-y-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <FeedPost
                key={post.id}
                post={post}
                session={session}
                onReact={handleLike}
                onComment={handleComment}
                isCommentSubmitting={addCommentMutation.isPending}
              />
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">{getEmptyMessage(activeTab, selectedCircle)}</p>
          )}
        </div>
      )}
    </div>
  );
}
