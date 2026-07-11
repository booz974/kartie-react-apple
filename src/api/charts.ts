import { supabase } from '@/lib/supabase';

export interface EngagementRow {
  quartier_nom: string;
  total_participants: number;
}

export interface SondageChaud {
  title?: string;
  vote_count?: number;
}

export interface ThemeRow {
  thematique: string;
  total: number;
}

export interface EvolutionRow {
  mois: string;
  total: number;
}

export async function getEngagementParQuartier(): Promise<EngagementRow[]> {
  const { data } = await supabase.rpc('get_engagement_par_quartier');
  return (data as EngagementRow[]) ?? [];
}

export async function getInteractionsSemaine(): Promise<number> {
  const { data } = await supabase.rpc('get_interactions_semaine');
  return (data as number) ?? 0;
}

export async function getSondageChaudSemaine(): Promise<SondageChaud | null> {
  const { data } = await supabase.rpc('get_sondage_chaud_semaine');
  if (data && (data as SondageChaud[]).length > 0) {
    return (data as SondageChaud[])[0];
  }
  return null;
}

export async function getTopThematiques(): Promise<ThemeRow[]> {
  const { data, error } = await supabase.rpc('get_top_thematiques');
  if (error) throw error;
  return (data as ThemeRow[]) ?? [];
}

export async function getEvolutionThematique(thematiqueSlug: string): Promise<EvolutionRow[]> {
  const { data, error } = await supabase.rpc('get_evolution_thematique', {
    thematique_slug: thematiqueSlug,
  });
  if (error) throw error;
  return (data as EvolutionRow[]) ?? [];
}
