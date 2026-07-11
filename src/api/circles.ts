import { supabase } from '@/lib/supabase';
import type { Circle } from '@/lib/types/contract';

export async function fetchCircles(quartierId: number, userId: string | null | undefined): Promise<Circle[]> {
  try {
    const { data: allCircles, error } = await supabase
      .from('neighborhood_circles')
      .select('*, circle_members(count)')
      .eq('quartier_id', quartierId)
      .is('deleted_at', null);

    if (error) throw error;

    let memberSet = new Set<number>();
    if (userId) {
      const { data: myMemberships } = await supabase
        .from('circle_members')
        .select('circle_id')
        .eq('user_id', userId);
      memberSet = new Set((myMemberships ?? []).map((m) => m.circle_id as number));
    }

    return (allCircles ?? []).map((c) => {
      const circle = c as Circle & { circle_members?: { count: number }[] };
      return {
        ...circle,
        member_count: circle.circle_members ? circle.circle_members[0]?.count ?? 0 : 0,
        is_member: memberSet.has(circle.id),
      };
    });
  } catch (error) {
    console.error('Error fetching circles:', error);
    return [];
  }
}

export async function createCircle(
  circleData: Record<string, unknown>,
  userId: string,
): Promise<{ data: Circle | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('neighborhood_circles')
      .insert({ ...circleData, created_by: userId })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('circle_members').insert({
      circle_id: data.id,
      user_id: userId,
      role: 'admin',
    });

    return { data: data as Circle, error: null };
  } catch (err) {
    console.error('Error creating circle:', err);
    return { data: null, error: err };
  }
}

export async function joinCircle(
  circleId: number,
  userId: string,
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const { error } = await supabase.from('circle_members').insert({
      circle_id: circleId,
      user_id: userId,
      role: 'member',
    });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error joining circle:', err);
    return { success: false, error: err };
  }
}
