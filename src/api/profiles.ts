import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types/contract';

const PROFILE_COLUMNS =
  'username, role, quartier_id, first_name, last_name, avatar_url';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error, status } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .single();

  if (error && status !== 406) throw error;
  return data ?? null;
}

export async function updateQuartier(
  userId: string,
  quartierId: number,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ quartier_id: quartierId })
    .eq('id', userId);

  if (error) throw error;
}

export interface ProfileUpsert {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  updated_at?: Date | string;
}

export async function upsertProfile(updates: ProfileUpsert): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(updates);
  if (error) throw error;
}

export async function listQuartiers(): Promise<Array<{ id: number; name: string }>> {
  const { data, error } = await supabase
    .from('quartiers')
    .select('id, name')
    .order('name');

  if (error) throw error;
  return data ?? [];
}
