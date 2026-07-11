import { useQuery } from '@tanstack/react-query';
import {
  fetchDashboardQuartiers,
  getQuartierAssociationsPreview,
  getQuartierById,
  getQuartierConsultations,
  getQuartierEvents,
  getQuartierNews,
  getQuartierPetitions,
  getQuartierRealisations,
  getQuartiersList,
} from '@/api/quartiers';
import { fetchQuartierZones } from '@/api/territory';
import { getEventById, getNewsById, getRealisationById } from '@/api/content';
import {
  castVote,
  getConsultationDetails,
  getUserSupports,
  getUserVotes,
} from '@/api/democracy';

const queryDefaults = {
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: false,
} as const;

export const territoryKeys = {
  quartiers: ['quartiers'] as const,
  dashboardQuartiers: ['quartiers', 'dashboard'] as const,
  quartierZones: ['quartier-zones'] as const,
  quartier: (id: number) => ['quartier', id] as const,
  quartierEvents: (id: number) => ['quartier-events', id] as const,
  quartierNews: (id: number) => ['quartier-news', id] as const,
  quartierRealisations: (id: number) => ['quartier-realisations', id] as const,
  quartierPetitions: (id: number) => ['quartier-petitions', id] as const,
  quartierAssociations: (id: number) => ['quartier-associations', id] as const,
  consultations: (quartierId: number) => ['consultations', quartierId] as const,
  consultationDetails: (id: number) => ['consultation-details', id] as const,
  userSupports: (userId: string) => ['user-supports', userId] as const,
  userVotes: (userId: string, quartierId: number) => ['user-votes', userId, quartierId] as const,
  event: (id: number) => ['event', id] as const,
  news: (id: number) => ['news', id] as const,
  realisation: (id: number) => ['realisation', id] as const,
};

export function useQuartiersList() {
  return useQuery({
    queryKey: territoryKeys.quartiers,
    queryFn: getQuartiersList,
    ...queryDefaults,
  });
}

export function useDashboardQuartiers() {
  return useQuery({
    queryKey: territoryKeys.dashboardQuartiers,
    queryFn: fetchDashboardQuartiers,
    ...queryDefaults,
  });
}

export function useQuartierZones() {
  return useQuery({
    queryKey: territoryKeys.quartierZones,
    queryFn: fetchQuartierZones,
    ...queryDefaults,
  });
}

export function useQuartier(id: number | undefined) {
  return useQuery({
    queryKey: territoryKeys.quartier(id ?? 0),
    queryFn: () => getQuartierById(id as number),
    enabled: id != null,
    ...queryDefaults,
  });
}

export function useQuartierEvents(quartierId: number | undefined) {
  return useQuery({
    queryKey: territoryKeys.quartierEvents(quartierId ?? 0),
    queryFn: () => getQuartierEvents(quartierId as number),
    enabled: quartierId != null,
    ...queryDefaults,
  });
}

export function useQuartierNews(quartierId: number | undefined) {
  return useQuery({
    queryKey: territoryKeys.quartierNews(quartierId ?? 0),
    queryFn: () => getQuartierNews(quartierId as number),
    enabled: quartierId != null,
    ...queryDefaults,
  });
}

export function useQuartierRealisations(quartierId: number | undefined) {
  return useQuery({
    queryKey: territoryKeys.quartierRealisations(quartierId ?? 0),
    queryFn: () => getQuartierRealisations(quartierId as number),
    enabled: quartierId != null,
    ...queryDefaults,
  });
}

export function useQuartierPetitions(quartierId: number | undefined) {
  return useQuery({
    queryKey: territoryKeys.quartierPetitions(quartierId ?? 0),
    queryFn: () => getQuartierPetitions(quartierId as number),
    enabled: quartierId != null,
    ...queryDefaults,
  });
}

export function useQuartierAssociationsPreview(quartierId: number | undefined) {
  return useQuery({
    queryKey: territoryKeys.quartierAssociations(quartierId ?? 0),
    queryFn: () => getQuartierAssociationsPreview(quartierId as number),
    enabled: quartierId != null,
    ...queryDefaults,
  });
}

export function useQuartierConsultations(quartierId: number | undefined) {
  return useQuery({
    queryKey: territoryKeys.consultations(quartierId ?? 0),
    queryFn: () => getQuartierConsultations(quartierId as number),
    enabled: quartierId != null,
    ...queryDefaults,
  });
}

export function useConsultationDetails(consultationId: number | undefined) {
  return useQuery({
    queryKey: territoryKeys.consultationDetails(consultationId ?? 0),
    queryFn: () => getConsultationDetails(consultationId as number),
    enabled: consultationId != null,
    ...queryDefaults,
  });
}

export function useUserSupports(
  userId: string | undefined,
  petitionIds: number[] | undefined,
) {
  return useQuery({
    queryKey: [...territoryKeys.userSupports(userId ?? ''), petitionIds ?? []],
    queryFn: () => getUserSupports(userId, petitionIds),
    enabled: Boolean(userId && petitionIds && petitionIds.length > 0),
    ...queryDefaults,
  });
}

export function useUserVotes(
  userId: string | undefined,
  quartierId: number | undefined,
) {
  return useQuery({
    queryKey: territoryKeys.userVotes(userId ?? '', quartierId ?? 0),
    queryFn: () => getUserVotes(userId, quartierId),
    enabled: Boolean(userId && quartierId),
    ...queryDefaults,
  });
}

export function useEvent(id: number | undefined) {
  return useQuery({
    queryKey: territoryKeys.event(id ?? 0),
    queryFn: () => getEventById(id as number),
    enabled: id != null,
    ...queryDefaults,
  });
}

export function useNews(id: number | undefined) {
  return useQuery({
    queryKey: territoryKeys.news(id ?? 0),
    queryFn: () => getNewsById(id as number),
    enabled: id != null,
    ...queryDefaults,
  });
}

export function useRealisation(id: number | undefined) {
  return useQuery({
    queryKey: territoryKeys.realisation(id ?? 0),
    queryFn: () => getRealisationById(id as number),
    enabled: id != null,
    ...queryDefaults,
  });
}

export { castVote };
