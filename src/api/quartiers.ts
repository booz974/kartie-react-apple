import { getQuartierAssociationEvents } from '@/api/associations';
import { supabase } from '@/lib/supabase';
import type {
  AgendaEvent,
  Consultation,
  Event,
  MunicipalAgendaEvent,
  News,
  Petition,
  Quartier,
  Realisation,
} from '@/lib/types/contract';

export interface DashboardQuartier {
  id: number;
  name: string;
  stats: Record<string, unknown> | null;
  catchphrase?: string | null;
  image_filename?: string | null;
  image?: string | null;
  image_url?: string | null;
  zone: { key: string } | null;
  zoneKey?: string;
}

function getAgendaEventTimestamp(event: AgendaEvent): number {
  if (event.source === 'association' && event.start_at) {
    return new Date(event.start_at).getTime();
  }
  if (event.source === 'municipal' && event.date) {
    return new Date(event.date).getTime();
  }
  return 0;
}

export { getQuartierAssociationsPreview } from '@/api/associations';

export async function getQuartierSummary(
  id: number,
): Promise<Pick<Quartier, 'id' | 'name'> | null> {
  try {
    const { data, error } = await supabase
      .from('quartiers')
      .select('id, name')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching quartier summary:', error);
    return null;
  }
}

export async function getQuartierListItems(
  quartierId: number,
  type: 'actualites' | 'realisations' | 'petitions',
): Promise<Event[] | News[] | Realisation[] | Petition[]> {
  try {
    const { data, error } = await supabase
      .from(type)
      .select('*')
      .eq('quartier_id', quartierId);
    if (error) throw error;
    return (data ?? []) as Event[] | News[] | Realisation[] | Petition[];
  } catch (error) {
    console.error('Error loading list data:', error);
    return [];
  }
}

export async function getQuartierById(id: number): Promise<Quartier | null> {
  try {
    const { data, error } = await supabase.from('quartiers').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching quartier:', error);
    return null;
  }
}

export async function getQuartiersList(): Promise<Quartier[]> {
  try {
    const { data, error } = await supabase
      .from('quartiers')
      .select('id, name, image_url, stats')
      .order('name');
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('Error fetching quartiers list:', error);
    return [];
  }
}

export async function fetchDashboardQuartiers(): Promise<DashboardQuartier[]> {
  try {
    const { data, error } = await supabase
      .from('quartiers')
      .select('id, name, stats, catchphrase, image_filename, zone:zones ( key )')
      .order('name');

    if (error) throw error;

    return (data ?? []).map((quartier) => {
      const row = quartier as DashboardQuartier & { zone?: { key: string } | { key: string }[] };
      const zone = Array.isArray(row.zone) ? (row.zone[0] ?? null) : (row.zone ?? null);
      const image =
        (row as { image?: string | null }).image ||
        row.image_url ||
        null;

      return {
        ...row,
        zone,
        zoneKey: zone?.key,
        image,
      };
    });
  } catch (error) {
    console.error('Erreur lors du chargement des données du dashboard:', error);
    return [];
  }
}

export async function getQuartierEvents(quartierId: number): Promise<AgendaEvent[] | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('quartier_id', quartierId)
      .order('date', { ascending: true })
      .gte('date', new Date().toISOString());

    if (error) throw error;

    const municipalEvents: MunicipalAgendaEvent[] = (data ?? []).map((event) => {
      const row = event as Event;
      return {
        ...row,
        source: 'municipal',
        routePath: `/events/${row.id}`,
        image: row.image || row.image_url || null,
      };
    });

    const associationEvents = await getQuartierAssociationEvents(quartierId, {
      upcomingOnly: true,
    });

    return [...municipalEvents, ...associationEvents].sort(
      (a, b) => getAgendaEventTimestamp(a) - getAgendaEventTimestamp(b),
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    return null;
  }
}

export async function getQuartierNews(quartierId: number): Promise<News[] | null> {
  try {
    const { data, error } = await supabase
      .from('actualites')
      .select('*')
      .eq('quartier_id', quartierId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching news:', error);
    return null;
  }
}

export async function getQuartierRealisations(quartierId: number): Promise<Realisation[] | null> {
  try {
    const { data, error } = await supabase
      .from('realisations')
      .select('*')
      .eq('quartier_id', quartierId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching realisations:', error);
    return null;
  }
}

export async function getQuartierPetitions(quartierId: number): Promise<Petition[] | null> {
  try {
    const { data, error } = await supabase
      .from('petitions')
      .select('*')
      .eq('quartier_id', quartierId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching petitions:', error);
    return null;
  }
}

export async function getQuartierConsultations(quartierId: number): Promise<Consultation[] | null> {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select(
        `
        *,
        multiple_choices,
        consultation_options (
          *,
          consultation_votes (count)
        )
      `,
      )
      .eq('quartier_id', quartierId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching consultations:', error);
    return null;
  }
}
