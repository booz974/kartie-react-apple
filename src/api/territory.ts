import { supabase } from '@/lib/supabase';

export interface DashboardQuartier {
  id: number;
  name: string;
  stats?: Record<string, unknown> | null;
  catchphrase?: string | null;
  image_filename?: string | null;
  zoneKey: string;
}

export type QuartierZones = Record<string, DashboardQuartier[]>;

export async function fetchQuartierZones(): Promise<QuartierZones> {
  const { data, error } = await supabase
    .from('quartiers')
    .select('id, name, stats, catchphrase, image_filename, zone:zones ( key )')
    .order('name');

  if (error) throw error;

  const zones: QuartierZones = {};
  for (const quartier of data ?? []) {
    const rawZone = quartier.zone as { key: string } | { key: string }[] | null;
    const zone = Array.isArray(rawZone) ? (rawZone[0] ?? null) : rawZone;
    if (!zone?.key) continue;

    const zoneKey = zone.key;
    if (!zones[zoneKey]) zones[zoneKey] = [];
    zones[zoneKey].push({ ...quartier, zoneKey });
  }

  return zones;
}
