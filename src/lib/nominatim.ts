const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const REUNION_VIEWBOX = '55.2,-21.4,55.9,-20.8';

export interface NominatimSearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

export interface NominatimReverseResult {
  display_name?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    footway?: string;
    path?: string;
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
  };
}

export function buildAutomaticAddress(data: NominatimReverseResult): string {
  const addr = data.address ?? {};
  const road = addr.road || addr.pedestrian || addr.footway || addr.path || '';
  const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';

  if (road) {
    return `${road}, ${suburb}`;
  }
  if (suburb) {
    return suburb;
  }
  if (data.display_name) {
    return data.display_name.split(',')[0] ?? 'Lieu non identifié';
  }
  return 'Lieu non identifié';
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const response = await fetch(
    `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
  );
  if (!response.ok) {
    throw new Error('Geocoding failed');
  }
  const data = (await response.json()) as NominatimReverseResult;
  return buildAutomaticAddress(data);
}

export async function searchLocations(query: string): Promise<NominatimSearchResult[]> {
  if (query.length < 3) {
    return [];
  }

  const response = await fetch(
    `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&viewbox=${REUNION_VIEWBOX}&bounded=1&limit=5`,
  );
  if (!response.ok) {
    throw new Error('Search failed');
  }
  return (await response.json()) as NominatimSearchResult[];
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
