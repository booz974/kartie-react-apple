import { supabase } from '@/lib/supabase';
import type { Event, News, Realisation } from '@/lib/types/contract';

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'PGRST116'
  );
}

export async function getEventById(id: number): Promise<Event | null> {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
  if (error) {
    if (isNotFoundError(error)) return null;
    console.error('Error fetching event:', error);
    throw error;
  }
  return data as Event;
}

export async function getNewsById(id: number): Promise<News | null> {
  const { data, error } = await supabase.from('actualites').select('*').eq('id', id).single();
  if (error) {
    if (isNotFoundError(error)) return null;
    console.error('Error fetching news:', error);
    throw error;
  }
  return data as News;
}

export async function getRealisationById(id: number): Promise<Realisation | null> {
  const { data, error } = await supabase
    .from('realisations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (isNotFoundError(error)) return null;
    console.error('Error fetching realisation:', error);
    throw error;
  }
  return data as Realisation;
}

export async function createEvent(
  payload: Record<string, unknown>,
): Promise<Event | null> {
  try {
    const { data, error } = await supabase.from('events').insert(payload).select().single();
    if (error) throw error;
    return data as Event;
  } catch (error) {
    console.error('Erreur création événement :', error);
    return null;
  }
}

export async function createNews(
  payload: Record<string, unknown>,
): Promise<News | null> {
  try {
    const { data, error } = await supabase.from('actualites').insert(payload).select().single();
    if (error) throw error;
    return data as News;
  } catch (error) {
    console.error('Erreur création actualité :', error);
    return null;
  }
}

export async function createRealisation(
  payload: Record<string, unknown>,
): Promise<Realisation | null> {
  try {
    const { data, error } = await supabase.from('realisations').insert(payload).select();
    if (error) throw error;
    return (data?.[0] as Realisation) ?? null;
  } catch (error) {
    console.error('Erreur création réalisation :', error);
    throw error;
  }
}
