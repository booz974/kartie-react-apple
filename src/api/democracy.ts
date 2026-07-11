import { supabase } from '@/lib/supabase';
import type {
  Consultation,
  ConsultationDetails,
  Petition,
  SondageAdminItem,
  SondageAdminOption,
  SondageAdminQuartierGroup,
} from '@/lib/types/contract';

/** Total votes for a sondage — Vue AdminSondagesView.totalVotes. */
export function totalSondageVotes(
  sondage: Pick<SondageAdminItem, 'options'> | { options: SondageAdminOption[] },
): number {
  return sondage.options.reduce((sum, option) => sum + (option.votes || 0), 0);
}

/**
 * Percentage bar width — Vue AdminSondagesView.calculatePercentage.
 * Returns 0 when total is 0 (no division by zero).
 */
export function calculateSondagePercentage(votes: number, total: number): number {
  if (total === 0) return 0;
  return (votes / total) * 100;
}

/**
 * Admin transversal sondages — Vue AdminSondagesView RPC (no params).
 * Returns [] on error (Vue keeps empty array after catch).
 */
export async function getAllSondagesByQuartier(): Promise<SondageAdminQuartierGroup[]> {
  try {
    const { data, error } = await supabase.rpc('get_all_sondages_by_quartier');
    if (error) throw error;
    return (data ?? []) as SondageAdminQuartierGroup[];
  } catch (error) {
    console.error('Erreur lors de la récupération des sondages:', error);
    return [];
  }
}

export async function getPetitionById(id: number): Promise<Petition | null> {
  try {
    const { data, error } = await supabase.from('petitions').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Petition;
  } catch (error) {
    console.error('Error fetching petition:', error);
    return null;
  }
}

export async function getUserSupports(
  userId: string | null | undefined,
  petitionIds: number[] | null | undefined,
): Promise<Set<number>> {
  if (!userId || !petitionIds || petitionIds.length === 0) return new Set();

  try {
    const { data, error } = await supabase
      .from('petition_supports')
      .select('petition_id')
      .eq('user_id', userId)
      .in('petition_id', petitionIds);

    if (error) throw error;
    return new Set((data ?? []).map((support) => support.petition_id as number));
  } catch (error) {
    console.error('Error fetching petition supports:', error);
    return new Set();
  }
}

export interface SupportPetitionResult {
  success: boolean;
  newCount?: number;
  new_count?: number;
  error?: unknown;
}

export async function supportPetition(
  petitionId: number,
  userId: string,
): Promise<SupportPetitionResult> {
  try {
    const { data, error } = await supabase.rpc('support_petition', {
      p_petition_id: petitionId,
      p_user_id: userId,
    });

    if (error) throw error;

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return result || { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error supporting petition:', error);
    return { success: false, error };
  }
}

export interface SupportPetitionDirectResult {
  success: boolean;
  newCount?: number;
}

export async function supportPetitionDirect(
  petitionId: number,
  userId: string,
  currentSupports: number,
): Promise<SupportPetitionDirectResult> {
  try {
    const newSupportCount = currentSupports + 1;

    const { error: supportError } = await supabase.from('petition_supports').insert({
      user_id: userId,
      petition_id: petitionId,
    });

    if (supportError) throw supportError;

    const { error: updateError } = await supabase
      .from('petitions')
      .update({ supports: newSupportCount })
      .eq('id', petitionId);

    if (updateError) {
      console.error('Erreur lors de la mise à jour du soutien :', updateError);
      return { success: false };
    }

    return { success: true, newCount: newSupportCount };
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du soutien :", error);
    return { success: false };
  }
}

export interface UserConsultationVote {
  id: number;
  consultation_option_id: number;
}

export async function getUserConsultationVotes(
  userId: string | null | undefined,
): Promise<UserConsultationVote[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('consultation_votes')
      .select('id, consultation_option_id')
      .eq('user_id', userId);

    if (error) throw error;
    return (data ?? []) as UserConsultationVote[];
  } catch (error) {
    console.error('Error fetching user consultation votes:', error);
    return [];
  }
}

export async function getUserVotes(
  userId: string | null | undefined,
  quartierId: number | null | undefined,
): Promise<Set<number>> {
  if (!userId || !quartierId) return new Set();

  try {
    const { data: votes, error } = await supabase
      .from('consultation_votes')
      .select(
        `
          consultation_option_id,
          consultation_options!inner (
            consultation_id,
            consultations!inner (
              quartier_id
            )
          )
        `,
      )
      .eq('user_id', userId)
      .eq('consultation_options.consultations.quartier_id', quartierId);

    if (error) throw error;

    const consultationIds = new Set<number>();
    if (votes && votes.length > 0) {
      votes.forEach((vote) => {
        const options = vote.consultation_options as
          | { consultation_id?: number }
          | { consultation_id?: number }[]
          | null;
        const option = Array.isArray(options) ? options[0] : options;
        if (option?.consultation_id) {
          consultationIds.add(option.consultation_id);
        }
      });
    }

    return consultationIds;
  } catch (error) {
    console.error('Error loading user votes:', error);
    return new Set();
  }
}

export interface CastVoteResult {
  success: boolean;
  error?: unknown;
}

export async function castVote(
  userId: string,
  optionId: number,
): Promise<CastVoteResult> {
  return castVotes(userId, [optionId]);
}

export async function castVotes(
  userId: string,
  optionIds: number[],
): Promise<CastVoteResult> {
  if (optionIds.length === 0) {
    return { success: false, error: new Error('No options selected') };
  }

  try {
    const votesToInsert = optionIds.map((optionId) => ({
      user_id: userId,
      consultation_option_id: optionId,
    }));

    const { error } = await supabase.from('consultation_votes').insert(votesToInsert);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export async function getConsultationDetails(
  consultationId: number,
): Promise<ConsultationDetails | null> {
  try {
    const { data, error } = await supabase.rpc('get_consultation_details', {
      consultation_id_param: consultationId,
    });
    if (error) throw error;
    return data as ConsultationDetails;
  } catch (error) {
    console.error('Error fetching consultation details:', error);
    return null;
  }
}

export interface CreateConsultationPayload {
  p_quartier_id: number;
  p_title: string;
  p_question: string;
  p_options: string[];
  p_summary: string | null;
  p_description: string | null;
  p_cover_image: string | null;
  p_multiple_choices: boolean;
}

export async function getConsultationsForList(
  quartierId: number,
): Promise<Consultation[]> {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select('*, consultation_options(*)')
      .eq('quartier_id', quartierId);
    if (error) throw error;
    return (data ?? []) as Consultation[];
  } catch (error) {
    console.error('Error fetching consultations list:', error);
    return [];
  }
}

export async function createPetition(
  payload: Record<string, unknown>,
): Promise<Petition | null> {
  try {
    const { data, error } = await supabase.from('petitions').insert(payload).select().single();
    if (error) throw error;
    return data as Petition;
  } catch (error) {
    console.error('Erreur création pétition :', error);
    return null;
  }
}

export async function createConsultationTransaction(
  payload: CreateConsultationPayload,
): Promise<{ data: unknown; error: unknown }> {
  const cleanPayload = JSON.parse(JSON.stringify(payload)) as CreateConsultationPayload;

  const timeout = new Promise<{ data: null; error: Error }>((_, reject) =>
    setTimeout(() => reject(new Error('Supabase ne répond pas (Timeout).')), 8000),
  );

  const rpcCall = supabase.rpc('create_consultation_transaction', cleanPayload);

  try {
    const result = await Promise.race([rpcCall, timeout]);
    return result as { data: unknown; error: unknown };
  } catch (error) {
    return { data: null, error };
  }
}
