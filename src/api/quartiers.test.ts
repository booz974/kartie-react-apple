import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

function createQueryBuilder(result: { data?: unknown; error?: unknown; count?: number }) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop) {
      if (prop === 'then') {
        return (onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(onFulfilled, onRejected);
      }
      if (!(prop in target)) {
        target[prop as string] = vi.fn(() => new Proxy(target, handler));
      }
      return target[prop as string];
    },
  };

  return new Proxy<Record<string, unknown>>({}, handler);
}

describe('quartiers api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('getQuartierById returns quartier payload on success', async () => {
    const payload = { id: 1, name: 'Centre', stats: { posts: 2 } };
    mockFrom.mockReturnValue(createQueryBuilder({ data: payload, error: null }));

    const { getQuartierById } = await import('./quartiers');
    const result = await getQuartierById(1);

    expect(mockFrom).toHaveBeenCalledWith('quartiers');
    expect(result).toEqual(payload);
  });

  it('getQuartierById returns null on error', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: new Error('not found') }));

    const { getQuartierById } = await import('./quartiers');
    const result = await getQuartierById(99);

    expect(result).toBeNull();
  });

  it('getQuartiersList returns ordered list payload', async () => {
    const payload = [
      { id: 1, name: 'A', image_url: 'a.jpg', stats: null },
      { id: 2, name: 'B', image_url: null, stats: { x: 1 } },
    ];
    mockFrom.mockReturnValue(createQueryBuilder({ data: payload, error: null }));

    const { getQuartiersList } = await import('./quartiers');
    const result = await getQuartiersList();

    expect(result).toEqual(payload);
  });

  it('getQuartiersList returns [] on error', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: new Error('db') }));

    const { getQuartiersList } = await import('./quartiers');
    const result = await getQuartiersList();

    expect(result).toEqual([]);
  });

  it('fetchDashboardQuartiers maps zone and defensive image fields', async () => {
    const payload = [
      {
        id: 3,
        name: 'Nord',
        stats: {},
        catchphrase: 'Bienvenue',
        image_filename: 'nord.jpg',
        image_url: 'https://cdn/nord.jpg',
        zone: { key: 'nord' },
      },
    ];
    mockFrom.mockReturnValue(createQueryBuilder({ data: payload, error: null }));

    const { fetchDashboardQuartiers } = await import('./quartiers');
    const result = await fetchDashboardQuartiers();

    expect(result).toEqual([
      {
        id: 3,
        name: 'Nord',
        stats: {},
        catchphrase: 'Bienvenue',
        image_filename: 'nord.jpg',
        image_url: 'https://cdn/nord.jpg',
        zone: { key: 'nord' },
        zoneKey: 'nord',
        image: 'https://cdn/nord.jpg',
      },
    ]);
  });

  it('getQuartierEvents merges municipal and association events with image fallback', async () => {
    const municipalPayload = [
      {
        id: 10,
        quartier_id: 1,
        title: 'Fête',
        date: '2030-01-15T10:00:00.000Z',
        image_url: 'event.jpg',
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'events') {
        return createQueryBuilder({ data: municipalPayload, error: null });
      }
      return createQueryBuilder({ data: [], error: null });
    });

    const { getQuartierEvents } = await import('./quartiers');
    const result = await getQuartierEvents(1);

    expect(result).toEqual([
      expect.objectContaining({
        id: 10,
        source: 'municipal',
        routePath: '/events/10',
        image: 'event.jpg',
      }),
    ]);
  });

  it('getQuartierConsultations returns nested options payload', async () => {
    const payload = [
      {
        id: 5,
        quartier_id: 1,
        title: 'Sondage',
        multiple_choices: false,
        consultation_options: [{ id: 1, consultation_votes: [{ count: 3 }] }],
      },
    ];
    mockFrom.mockReturnValue(createQueryBuilder({ data: payload, error: null }));

    const { getQuartierConsultations } = await import('./quartiers');
    const result = await getQuartierConsultations(1);

    expect(result).toEqual(payload);
  });
});
