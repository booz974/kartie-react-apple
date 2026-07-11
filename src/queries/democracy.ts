import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  castVotes,
  createConsultationTransaction,
  getAllSondagesByQuartier,
  getPetitionById,
  getUserConsultationVotes,
  getUserSupports,
  supportPetition,
  supportPetitionDirect,
  type CreateConsultationPayload,
} from '@/api/democracy';
import { territoryKeys } from '@/queries/territory';

const queryDefaults = {
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: false,
} as const;

export const democracyKeys = {
  petition: (id: number) => ['petition', id] as const,
  userConsultationVotes: (userId: string) => ['user-consultation-votes', userId] as const,
  /** Admin transversal — isolated from citizen consultation keys. */
  adminSondages: () => ['admin-sondages'] as const,
};

/** AdminSondagesView — RPC get_all_sondages_by_quartier. */
export function useAdminSondages() {
  return useQuery({
    queryKey: democracyKeys.adminSondages(),
    queryFn: getAllSondagesByQuartier,
    ...queryDefaults,
  });
}

export function usePetition(id: number | undefined) {
  return useQuery({
    queryKey: democracyKeys.petition(id ?? 0),
    queryFn: () => getPetitionById(id as number),
    enabled: id != null,
    ...queryDefaults,
  });
}

export function usePetitionSupportStatus(
  userId: string | undefined,
  petitionId: number | undefined,
) {
  return useQuery({
    queryKey: [...territoryKeys.userSupports(userId ?? ''), petitionId ?? 0],
    queryFn: () => getUserSupports(userId, petitionId != null ? [petitionId] : []),
    enabled: Boolean(userId && petitionId != null),
    ...queryDefaults,
  });
}

export function useUserConsultationVotes(userId: string | undefined) {
  return useQuery({
    queryKey: democracyKeys.userConsultationVotes(userId ?? ''),
    queryFn: () => getUserConsultationVotes(userId),
    enabled: Boolean(userId),
    ...queryDefaults,
  });
}

export function useSupportPetitionRpcMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ petitionId, userId }: { petitionId: number; userId: string }) =>
      supportPetition(petitionId, userId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: democracyKeys.petition(variables.petitionId),
      });
      void queryClient.invalidateQueries({
        queryKey: territoryKeys.quartierPetitions(0),
      });
    },
  });
}

export function useSupportPetitionDirectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      petitionId,
      userId,
      currentSupports,
    }: {
      petitionId: number;
      userId: string;
      currentSupports: number;
    }) => supportPetitionDirect(petitionId, userId, currentSupports),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: democracyKeys.petition(variables.petitionId),
      });
      void queryClient.invalidateQueries({
        queryKey: territoryKeys.quartierPetitions(0),
      });
    },
  });
}

export function useCastConsultationVotesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, optionIds }: { userId: string; optionIds: number[] }) =>
      castVotes(userId, optionIds),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: democracyKeys.userConsultationVotes(variables.userId),
      });
    },
  });
}

export function useCreateConsultationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateConsultationPayload) => createConsultationTransaction(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: territoryKeys.consultations(variables.p_quartier_id),
      });
      void queryClient.invalidateQueries({
        queryKey: territoryKeys.quartier(variables.p_quartier_id),
      });
    },
  });
}
