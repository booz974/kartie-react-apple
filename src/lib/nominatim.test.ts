import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAutomaticAddress,
  debounce,
  reverseGeocode,
  searchLocations,
} from './nominatim';

describe('nominatim', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buildAutomaticAddress prefers road and suburb', () => {
    expect(
      buildAutomaticAddress({
        address: { road: 'Rue Test', suburb: 'Centre' },
      }),
    ).toBe('Rue Test, Centre');
  });

  it('buildAutomaticAddress falls back to display_name first segment', () => {
    expect(buildAutomaticAddress({ display_name: 'Saint-Denis, La Réunion' })).toBe('Saint-Denis');
  });

  it('reverseGeocode returns formatted address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          address: { road: 'Rue de Paris', suburb: 'Le Chaudron' },
        }),
      }),
    );

    const address = await reverseGeocode(-20.88, 55.45);
    expect(address).toBe('Rue de Paris, Le Chaudron');
  });

  it('searchLocations returns empty for short query', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchLocations('ab');
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('searchLocations calls Nominatim with reunion viewbox', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ place_id: 1, lat: '-20.88', lon: '55.45', display_name: 'Test' }],
      }),
    );

    const results = await searchLocations('eglise');
    expect(results).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('viewbox=55.2,-21.4,55.9,-20.8'),
    );
  });

  it('debounce delays execution', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 800);

    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(800);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
