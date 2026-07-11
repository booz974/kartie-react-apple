import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addComment, createPost, fetchFeedPosts, toggleReaction } from '@/api/feed';
import { createCircle, fetchCircles, joinCircle } from '@/api/circles';

const queryDefaults = {
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: false,
} as const;

export const socialKeys = {
  feed: (quartierId: number) => ['feed', quartierId] as const,
  circles: (quartierId: number, userId: string) => ['circles', quartierId, userId] as const,
};

export function useFeedPosts(quartierId: number | undefined) {
  return useQuery({
    queryKey: socialKeys.feed(quartierId ?? 0),
    queryFn: () => fetchFeedPosts(quartierId as number),
    enabled: quartierId != null,
    ...queryDefaults,
  });
}

export function useCircles(quartierId: number | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: socialKeys.circles(quartierId ?? 0, userId ?? ''),
    queryFn: () => fetchCircles(quartierId as number, userId),
    enabled: Boolean(quartierId != null && userId),
    ...queryDefaults,
  });
}

export function useCreatePostMutation(quartierId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postData: Record<string, unknown>) => createPost(postData),
    onSuccess: (result) => {
      if (!result.error && quartierId != null) {
        void queryClient.invalidateQueries({ queryKey: socialKeys.feed(quartierId) });
      }
    },
  });
}

export function useAddCommentMutation(quartierId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentData: Record<string, unknown>) => addComment(commentData),
    onSuccess: (result) => {
      if (!result.error && quartierId != null) {
        void queryClient.invalidateQueries({ queryKey: socialKeys.feed(quartierId) });
      }
    },
  });
}

export function useToggleReactionMutation() {
  return useMutation({
    mutationFn: ({
      postId,
      userId,
      reactionType,
    }: {
      postId: number;
      userId: string;
      reactionType: string;
    }) => toggleReaction(postId, userId, reactionType),
  });
}

export function useCreateCircleMutation(quartierId: number | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      circleData,
      creatorId,
    }: {
      circleData: Record<string, unknown>;
      creatorId: string;
    }) => createCircle(circleData, creatorId),
    onSuccess: (result) => {
      if (!result.error && quartierId != null && userId) {
        void queryClient.invalidateQueries({ queryKey: socialKeys.circles(quartierId, userId) });
      }
    },
  });
}

export function useJoinCircleMutation(quartierId: number | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ circleId, memberId }: { circleId: number; memberId: string }) =>
      joinCircle(circleId, memberId),
    onSuccess: (result) => {
      if (result.success && quartierId != null && userId) {
        void queryClient.invalidateQueries({ queryKey: socialKeys.circles(quartierId, userId) });
      }
    },
  });
}
