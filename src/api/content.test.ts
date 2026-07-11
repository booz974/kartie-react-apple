import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

function createQueryBuilder(result: { data?: unknown; error?: unknown }) {
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

describe('content api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('getEventById returns event on success', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: { id: 1, title: 'Fête', quartier_id: 1 },
        error: null,
      }),
    );

    const { getEventById } = await import('./content');
    const event = await getEventById(1);

    expect(mockFrom).toHaveBeenCalledWith('events');
    expect(event?.title).toBe('Fête');
  });

  it('getEventById returns null on PGRST116 not found', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      }),
    );

    const { getEventById } = await import('./content');
    await expect(getEventById(999)).resolves.toBeNull();
  });

  it('getEventById throws on non-not-found errors', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { code: '42501', message: 'permission denied' },
      }),
    );

    const { getEventById } = await import('./content');
    await expect(getEventById(1)).rejects.toMatchObject({ code: '42501' });
  });

  it('getNewsById queries actualites table', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: { id: 2, title: 'Actu', quartier_id: 1, content: 'Hello' },
        error: null,
      }),
    );

    const { getNewsById } = await import('./content');
    const news = await getNewsById(2);

    expect(mockFrom).toHaveBeenCalledWith('actualites');
    expect(news?.title).toBe('Actu');
  });

  it('getRealisationById queries realisations table', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: { id: 3, title: 'Réal', quartier_id: 1 },
        error: null,
      }),
    );

    const { getRealisationById } = await import('./content');
    const item = await getRealisationById(3);

    expect(mockFrom).toHaveBeenCalledWith('realisations');
    expect(item?.title).toBe('Réal');
  });

  it('createEvent inserts into events and returns row', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: { id: 10, title: 'New', quartier_id: 1 },
        error: null,
      }),
    );

    const { createEvent } = await import('./content');
    const created = await createEvent({ title: 'New', quartier_id: 1 });

    expect(mockFrom).toHaveBeenCalledWith('events');
    expect(created?.id).toBe(10);
  });

  it('createEvent returns null on insert error', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { message: 'fail' },
      }),
    );

    const { createEvent } = await import('./content');
    await expect(createEvent({ title: 'X' })).resolves.toBeNull();
  });

  it('createNews inserts into actualites', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: { id: 11, title: 'News', quartier_id: 1 },
        error: null,
      }),
    );

    const { createNews } = await import('./content');
    const created = await createNews({ title: 'News', content: 'c', quartier_id: 1 });

    expect(mockFrom).toHaveBeenCalledWith('actualites');
    expect(created?.id).toBe(11);
  });

  it('createRealisation inserts into realisations and rethrows on error', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { message: 'insert fail' },
      }),
    );

    const { createRealisation } = await import('./content');
    await expect(createRealisation({ title: 'R' })).rejects.toMatchObject({
      message: 'insert fail',
    });
    expect(mockFrom).toHaveBeenCalledWith('realisations');
  });

  it('createRealisation returns first row on success', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: [{ id: 12, title: 'Réal', quartier_id: 1 }],
        error: null,
      }),
    );

    const { createRealisation } = await import('./content');
    const created = await createRealisation({ title: 'Réal', quartier_id: 1 });
    expect(created?.id).toBe(12);
  });
});
