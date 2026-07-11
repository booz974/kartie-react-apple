import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAssociationPost,
  followAssociation,
  getAssociationByIdentifier,
  getAssociationEventById,
  getAssociationEvents,
  getAssociationMembership,
  getAssociationPosts,
  getAssociationsForAdminReview,
  getQuartierAssociations,
  isFollowingAssociation,
  removeAssociationPost,
  unfollowAssociation,
  updateAssociationPost,
  type AdminReviewFilters,
  type CreateAssociationPostPayload,
  type QuartierAssociationsFilters,
  type UpdateAssociationPostPayload,
} from '@/api/associations';
import { getQuartierById } from '@/api/quartiers';
import { socialKeys } from '@/queries/social';

const queryDefaults = {
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: false,
} as const;

export const associationKeys = {
  list: (quartierId: number, filters: QuartierAssociationsFilters) =>
    ['associations', quartierId, filters] as const,
  detail: (idOrSlug: string | number) => ['association', idOrSlug] as const,
  dashboard: (id: string | number, userId: string) =>
    ['association-dashboard', id, userId] as const,
  event: (eventId: number) => ['association-event', eventId] as const,
  adminReview: (filters: AdminReviewFilters = {}) =>
    ['associations-admin-review', filters] as const,
};

export function useAssociationsForAdminReview(filters: AdminReviewFilters = {}) {
  return useQuery({
    queryKey: associationKeys.adminReview(filters),
    queryFn: () => getAssociationsForAdminReview(filters),
    ...queryDefaults,
  });
}

export function useQuartierAssociations(
  quartierId: number | undefined,
  filters: QuartierAssociationsFilters,
  userId?: string,
) {
  const listQuery = useQuery({
    queryKey: associationKeys.list(quartierId ?? 0, filters),
    queryFn: () => getQuartierAssociations(quartierId as number, filters),
    enabled: quartierId != null,
    ...queryDefaults,
  });

  const followStatesQuery = useQuery({
    queryKey: [...associationKeys.list(quartierId ?? 0, filters), 'follows', userId ?? ''] as const,
    queryFn: async () => {
      const associations = listQuery.data ?? [];
      if (!userId || associations.length === 0) return {} as Record<number, boolean>;

      const entries = await Promise.all(
        associations.map(async (association) => [
          association.id,
          await isFollowingAssociation(association.id, userId),
        ] as const),
      );

      return Object.fromEntries(entries) as Record<number, boolean>;
    },
    enabled: quartierId != null && Boolean(userId) && (listQuery.data?.length ?? 0) > 0,
    ...queryDefaults,
  });

  return {
    ...listQuery,
    followStates: followStatesQuery.data ?? {},
    followStatesLoading: followStatesQuery.isLoading,
  };
}

export function useAssociation(
  idOrSlug: string | undefined,
  userId?: string,
  profileRole?: string,
) {
  const detailQuery = useQuery({
    queryKey: associationKeys.detail(idOrSlug ?? ''),
    queryFn: () => getAssociationByIdentifier(idOrSlug as string),
    enabled: Boolean(idOrSlug),
    ...queryDefaults,
  });

  const associationId = detailQuery.data?.id;

  const postsQuery = useQuery({
    queryKey: [...associationKeys.detail(idOrSlug ?? ''), 'posts'] as const,
    queryFn: () => getAssociationPosts(associationId as number),
    enabled: associationId != null,
    ...queryDefaults,
  });

  const eventsQuery = useQuery({
    queryKey: [...associationKeys.detail(idOrSlug ?? ''), 'events'] as const,
    queryFn: () => getAssociationEvents(associationId as number),
    enabled: associationId != null,
    ...queryDefaults,
  });

  const membershipQuery = useQuery({
    queryKey: [...associationKeys.detail(idOrSlug ?? ''), 'membership', userId ?? ''] as const,
    queryFn: () => getAssociationMembership(associationId as number, userId as string),
    enabled: associationId != null && Boolean(userId),
    ...queryDefaults,
  });

  const followQuery = useQuery({
    queryKey: [...associationKeys.detail(idOrSlug ?? ''), 'follow', userId ?? ''] as const,
    queryFn: () => isFollowingAssociation(associationId as number, userId as string),
    enabled: associationId != null && Boolean(userId),
    ...queryDefaults,
  });

  const quartierQuery = useQuery({
    queryKey: [...associationKeys.detail(idOrSlug ?? ''), 'quartier'] as const,
    queryFn: () => getQuartierById(detailQuery.data?.quartier_id as number),
    enabled: detailQuery.data?.quartier_id != null,
    ...queryDefaults,
  });

  const canManage =
    Boolean(membershipQuery.data) || profileRole === 'admin';

  return {
    association: detailQuery.data ?? null,
    posts: postsQuery.data ?? [],
    events: eventsQuery.data ?? [],
    membership: membershipQuery.data ?? null,
    isFollowing: followQuery.data ?? false,
    quartierName: quartierQuery.data?.name ?? 'ce quartier',
    canManage,
    isLoading:
      detailQuery.isLoading ||
      (associationId != null && (postsQuery.isLoading || eventsQuery.isLoading)),
    isNotFound: !detailQuery.isLoading && !detailQuery.data && Boolean(idOrSlug),
    refetchAll: async () => {
      await Promise.all([
        detailQuery.refetch(),
        postsQuery.refetch(),
        eventsQuery.refetch(),
        membershipQuery.refetch(),
        followQuery.refetch(),
      ]);
    },
  };
}

export function useAssociationEvent(eventId: number | undefined) {
  return useQuery({
    queryKey: associationKeys.event(eventId ?? 0),
    queryFn: () => getAssociationEventById(eventId as number),
    enabled: eventId != null,
    ...queryDefaults,
  });
}

export function useFollowAssociationMutation(
  quartierId?: number,
  listFilters?: QuartierAssociationsFilters,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      associationId,
      userId,
      following,
    }: {
      associationId: number;
      userId: string;
      following: boolean;
    }) => {
      const action = following ? unfollowAssociation : followAssociation;
      return action(associationId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['association'] });
      if (quartierId != null && listFilters) {
        queryClient.invalidateQueries({
          queryKey: associationKeys.list(quartierId, listFilters),
        });
      }
    },
  });
}

async function invalidateAssociationPostQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  associationId: number,
  userId: string,
  quartierId?: number | null,
) {
  await queryClient.invalidateQueries({ queryKey: ['association'] });
  await queryClient.invalidateQueries({
    queryKey: associationKeys.dashboard(associationId, userId),
  });
  if (quartierId != null) {
    await queryClient.invalidateQueries({ queryKey: socialKeys.feed(quartierId) });
  }
}

export function useCreateAssociationPostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      userId,
    }: {
      payload: CreateAssociationPostPayload;
      userId: string;
    }) => createAssociationPost(payload, userId),
    onSuccess: async (result, variables) => {
      if (!result.success) return;
      await invalidateAssociationPostQueries(
        queryClient,
        variables.payload.association_id,
        variables.userId,
        variables.payload.quartier_id,
      );
    },
  });
}

export function useUpdateAssociationPostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      postId: number;
      payload: UpdateAssociationPostPayload;
      userId: string;
      associationId: number;
      quartierId?: number | null;
    }) => updateAssociationPost(vars.postId, vars.payload, vars.userId),
    onSuccess: async (result, variables) => {
      if (!result.success) return;
      await invalidateAssociationPostQueries(
        queryClient,
        variables.associationId,
        variables.userId,
        variables.quartierId,
      );
    },
  });
}

export function useRemoveAssociationPostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      postId: number;
      userId: string;
      associationId: number;
      quartierId?: number | null;
    }) => removeAssociationPost(vars.postId, vars.userId),
    onSuccess: async (result, variables) => {
      if (!result.success) return;
      await invalidateAssociationPostQueries(
        queryClient,
        variables.associationId,
        variables.userId,
        variables.quartierId,
      );
    },
  });
}
