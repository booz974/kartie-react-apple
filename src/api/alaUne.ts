import { supabase } from '@/lib/supabase';
import type {
  AlaUneContent,
  AlaUneContentType,
  AlaUneSondageOption,
  UserAlaUneVote,
} from '@/lib/types/contract';

export async function fetchAlaUneContent(): Promise<AlaUneContent[]> {
  try {
    const { data, error } = await supabase
      .from('ala_une_content')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("Erreur lors de la récupération des données 'À la Une':", error);
    return [];
  }
}

/** Admin list — all rows, newest first (Vue AdminAlaUneView). */
export async function fetchAllAlaUneContent(): Promise<AlaUneContent[]> {
  try {
    const { data, error } = await supabase
      .from('ala_une_content')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("Erreur de chargement À la Une (admin):", error);
    return [];
  }
}

/** @deprecated Use fetchAlaUneContent — kept for existing imports */
export const fetchActiveAlaUneContent = fetchAlaUneContent;

export interface AlaUneFormOptionDraft {
  text: string;
  votes: number;
}

export interface AlaUneFormValues {
  id?: number;
  type: AlaUneContentType;
  title: string;
  content: string;
  image_url: string;
  event_date: string;
  location: string;
  sondage_options: AlaUneFormOptionDraft[];
  is_active: boolean;
}

/**
 * Build create/update payload matching Vue AlaUneForm.handleSubmit cleanup.
 * Hard fields omitted per type (undefined keys stripped).
 */
export function buildAlaUnePayload(
  form: AlaUneFormValues,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: form.type,
    title: form.title,
    content: form.content,
    image_url: form.image_url,
    event_date: form.event_date,
    location: form.location,
    sondage_options: form.sondage_options,
    is_active: form.is_active,
  };

  if (form.id != null) {
    payload.id = form.id;
  }

  if (payload.type === 'article') {
    payload.event_date = undefined;
    payload.location = undefined;
    payload.sondage_options = undefined;
  } else if (payload.type === 'event') {
    payload.sondage_options = undefined;
    if (typeof payload.event_date === 'string' && payload.event_date) {
      payload.event_date = new Date(payload.event_date).toISOString();
    }
  } else if (payload.type === 'sondage') {
    const options = (payload.sondage_options as AlaUneFormOptionDraft[]).filter(
      (opt) => opt.text.trim() !== '',
    );
    payload.sondage_options = options.map(
      (opt): AlaUneSondageOption => ({
        option_text: opt.text,
        vote_count: opt.votes || 0,
      }),
    );
    payload.event_date = undefined;
    payload.location = undefined;
    payload.content = undefined;
    payload.image_url = undefined;
  } else if (payload.type === 'flash_info') {
    payload.event_date = undefined;
    payload.location = undefined;
    payload.title = undefined;
    payload.image_url = undefined;
    payload.sondage_options = undefined;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
}

export function mapAlaUneRowToFormValues(
  item: AlaUneContent | null | undefined,
): AlaUneFormValues {
  if (!item) {
    return {
      type: 'article',
      title: '',
      content: '',
      image_url: '',
      event_date: '',
      location: '',
      sondage_options: [{ text: '', votes: 0 }],
      is_active: true,
    };
  }

  let eventDate = '';
  if (item.event_date) {
    const d = new Date(item.event_date);
    if (!Number.isNaN(d.getTime())) {
      eventDate = d.toISOString().slice(0, 16);
    }
  }

  const rawOptions = Array.isArray(item.sondage_options) ? item.sondage_options : [];
  const sondage_options: AlaUneFormOptionDraft[] =
    rawOptions.length > 0
      ? rawOptions.map((opt) => {
          const row = opt as AlaUneSondageOption & { text?: string; votes?: number };
          return {
            text: row.option_text ?? row.text ?? '',
            votes: row.vote_count ?? row.votes ?? 0,
          };
        })
      : [{ text: '', votes: 0 }];

  return {
    id: item.id,
    type: item.type,
    title: item.title ?? '',
    content: item.content ?? '',
    image_url: item.image_url ?? '',
    event_date: eventDate,
    location: item.location ?? '',
    sondage_options,
    is_active: item.is_active !== false,
  };
}

export async function createAlaUneContent(
  payload: Record<string, unknown>,
): Promise<AlaUneContent> {
  const { data, error } = await supabase
    .from('ala_une_content')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as AlaUneContent;
}

export async function updateAlaUneContent(
  id: number,
  payload: Record<string, unknown>,
): Promise<AlaUneContent> {
  const { data, error } = await supabase
    .from('ala_une_content')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as AlaUneContent;
}

/**
 * Hard DELETE — Vue AdminAlaUneView uses `.delete()`, not `admin_soft_delete`.
 * Do not route through useAdminDelete.
 */
export async function deleteAlaUneContent(id: number): Promise<void> {
  const { error } = await supabase.from('ala_une_content').delete().eq('id', id);
  if (error) throw error;
}

export async function saveAlaUneContent(
  form: AlaUneFormValues,
): Promise<AlaUneContent> {
  const payload = buildAlaUnePayload(form);
  if (form.id != null) {
    const { id: _id, ...updateData } = payload;
    void _id;
    return updateAlaUneContent(form.id, updateData);
  }
  return createAlaUneContent(payload);
}

export async function getUserAlaUneVote(
  userId: string,
  sondageId: number,
): Promise<UserAlaUneVote | null> {
  try {
    const { data, error } = await supabase
      .from('user_ala_une_votes')
      .select('id, user_id, ala_une_content_id')
      .eq('user_id', userId)
      .eq('ala_une_content_id', sondageId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user ala une vote:', error);
    return null;
  }
}

export async function checkUserAlaUneVote(
  userId: string,
  sondageId: number,
): Promise<boolean> {
  const vote = await getUserAlaUneVote(userId, sondageId);
  return vote !== null;
}

export async function incrementAlaUneVote(
  sondageId: number,
  optionIndex: number,
): Promise<void> {
  const { error } = await supabase.rpc('increment_ala_une_vote', {
    p_ala_une_id: sondageId,
    p_option_index: optionIndex,
  });

  if (error) throw error;
}

export interface CastAlaUneVoteInput {
  userId: string;
  sondageId: number;
  optionId: number;
}

export interface CastAlaUneVoteResult {
  success: boolean;
  error?: unknown;
}

export async function castAlaUneVote({
  userId,
  sondageId,
  optionId,
}: CastAlaUneVoteInput): Promise<CastAlaUneVoteResult> {
  try {
    if (!sondageId || optionId === undefined || !userId) {
      throw new Error(
        'Les informations pour le vote (sondageId, optionId, userId) sont incomplètes.',
      );
    }

    const existingVote = await getUserAlaUneVote(userId, sondageId);
    if (existingVote) {
      throw new Error('Vous avez déjà voté pour ce sondage.');
    }

    await incrementAlaUneVote(sondageId, optionId);

    const { error: insertError } = await supabase.from('user_ala_une_votes').insert({
      user_id: userId,
      ala_une_content_id: sondageId,
    });

    if (insertError) throw insertError;

    return { success: true };
  } catch (error) {
    console.error('Erreur lors du vote:', error);
    return { success: false, error };
  }
}
