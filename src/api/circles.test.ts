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

describe('circles api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('fetchCircles maps member_count and is_member', async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex += 1;
      if (callIndex === 1) {
        return createQueryBuilder({
          data: [
            { id: 1, name: 'Jardiniers', circle_members: [{ count: 5 }] },
            { id: 2, name: 'Privé', circle_members: [{ count: 2 }] },
          ],
          error: null,
        });
      }
      return createQueryBuilder({
        data: [{ circle_id: 1 }],
        error: null,
      });
    });

    const { fetchCircles } = await import('./circles');
    const circles = await fetchCircles(1, 'user-abc');

    expect(circles).toHaveLength(2);
    expect(circles[0].member_count).toBe(5);
    expect(circles[0].is_member).toBe(true);
    expect(circles[1].is_member).toBe(false);
  });

  it('fetchCircles returns empty array on error', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: new Error('fail') }));

    const { fetchCircles } = await import('./circles');
    const circles = await fetchCircles(1, null);

    expect(circles).toEqual([]);
  });

  it('fetchCircles skips membership query when userId is absent', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: [{ id: 1, name: 'Test', circle_members: [{ count: 1 }] }],
        error: null,
      }),
    );

    const { fetchCircles } = await import('./circles');
    const circles = await fetchCircles(1, undefined);

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(circles[0].is_member).toBe(false);
  });

  it('createCircle inserts circle and admin membership', async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex += 1;
      if (callIndex === 1) {
        return createQueryBuilder({
          data: { id: 42, name: 'New Circle', quartier_id: 1 },
          error: null,
        });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { createCircle } = await import('./circles');
    const { data, error } = await createCircle(
      { quartier_id: 1, name: 'New Circle', description: 'Desc', type: 'private' },
      'user-abc',
    );

    expect(error).toBeNull();
    expect(data?.id).toBe(42);
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('joinCircle inserts member with role member', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: null }));

    const { joinCircle } = await import('./circles');
    const result = await joinCircle(5, 'user-abc');

    expect(result.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('circle_members');
  });

  it('joinCircle returns failure on error', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: new Error('duplicate') }));

    const { joinCircle } = await import('./circles');
    const result = await joinCircle(5, 'user-abc');

    expect(result.success).toBe(false);
  });
});
