import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  castAlaUneVote,
  deleteAlaUneContent,
  fetchAlaUneContent,
  fetchAllAlaUneContent,
  getUserAlaUneVote,
  saveAlaUneContent,
  type AlaUneFormValues,
  type CastAlaUneVoteInput,
} from '@/api/alaUne';
import { transformAlaUneData } from '@/utils/alaUneUtils';

const queryDefaults = {
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: false,
} as const;

export const alaUneKeys = {
  all: ['ala-une'] as const,
  admin: ['ala-une', 'admin'] as const,
  vote: (userId: string, sondageId?: number) =>
    sondageId != null
      ? (['ala-une-vote', userId, sondageId] as const)
      : (['ala-une-vote', userId] as const),
};

export function useAlaUne() {
  return useQuery({
    queryKey: alaUneKeys.all,
    queryFn: async () => {
      const data = await fetchAlaUneContent();
      return transformAlaUneData(data);
    },
    ...queryDefaults,
  });
}

/** @deprecated Use useAlaUne */
export const useAlaUneData = useAlaUne;

export function useAdminAlaUneList() {
  return useQuery({
    queryKey: alaUneKeys.admin,
    queryFn: fetchAllAlaUneContent,
    ...queryDefaults,
  });
}

export function useAlaUneVote(userId: string | undefined, sondageId: number | undefined) {
  return useQuery({
    queryKey: alaUneKeys.vote(userId ?? '', sondageId),
    queryFn: () => getUserAlaUneVote(userId as string, sondageId as number),
    enabled: Boolean(userId && sondageId),
    ...queryDefaults,
  });
}

function invalidateAlaUneSurfaces(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: alaUneKeys.all });
  void queryClient.invalidateQueries({ queryKey: alaUneKeys.admin });
}

export function useSaveAlaUne() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (form: AlaUneFormValues) => saveAlaUneContent(form),
    onSuccess: () => {
      invalidateAlaUneSurfaces(queryClient);
    },
  });
}

export function useDeleteAlaUne() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteAlaUneContent(id),
    onSuccess: () => {
      invalidateAlaUneSurfaces(queryClient);
    },
  });
}

export function useCastAlaUneVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CastAlaUneVoteInput) => castAlaUneVote(input),
    onSuccess: (result, variables) => {
      if (result.success) {
        void queryClient.invalidateQueries({ queryKey: alaUneKeys.all });
        void queryClient.invalidateQueries({
          queryKey: alaUneKeys.vote(variables.userId, variables.sondageId),
        });
      }
    },
  });
}

export function useInvalidateAlaUne() {
  const queryClient = useQueryClient();
  return () => {
    invalidateAlaUneSurfaces(queryClient);
  };
}
