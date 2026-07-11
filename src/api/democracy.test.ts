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

describe('democracy api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('getPetitionById returns petition payload on success', async () => {
    const payload = { id: 4, title: 'Test', supports: 10, quartier_id: 1 };
    mockFrom.mockReturnValue(createQueryBuilder({ data: payload, error: null }));

    const { getPetitionById } = await import('./democracy');
    const result = await getPetitionById(4);

    expect(mockFrom).toHaveBeenCalledWith('petitions');
    expect(result).toEqual(payload);
  });

  it('getPetitionById returns null on error', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: new Error('not found') }));

    const { getPetitionById } = await import('./democracy');
    const result = await getPetitionById(99);

    expect(result).toBeNull();
  });

  it('supportPetition returns failure when RPC is missing (PGRST202)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'function not found' },
    });

    const { supportPetition } = await import('./democracy');
    const result = await supportPetition(4, 'user-uuid');

    expect(mockRpc).toHaveBeenCalledWith('support_petition', {
      p_petition_id: 4,
      p_user_id: 'user-uuid',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('supportPetition parses JSON string RPC response', async () => {
    mockRpc.mockResolvedValue({
      data: JSON.stringify({ success: true, new_count: 11 }),
      error: null,
    });

    const { supportPetition } = await import('./democracy');
    const result = await supportPetition(4, 'user-uuid');

    expect(result).toEqual({ success: true, new_count: 11 });
  });

  it('supportPetitionDirect inserts support and updates count', async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount += 1;
      if (table === 'petition_supports') {
        return createQueryBuilder({ data: null, error: null });
      }
      if (table === 'petitions') {
        return createQueryBuilder({ data: null, error: null });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { supportPetitionDirect } = await import('./democracy');
    const result = await supportPetitionDirect(4, 'user-uuid', 10);

    expect(result).toEqual({ success: true, newCount: 11 });
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('castVotes returns failure on duplicate vote (23505)', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: null,
        error: { code: '23505', message: 'duplicate key value' },
      }),
    );

    const { castVotes } = await import('./democracy');
    const result = await castVotes('user-uuid', [1, 2]);

    expect(result.success).toBe(false);
    expect(result.error).toMatchObject({ code: '23505' });
  });

  it('castVotes inserts batch on success', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: null }));

    const { castVotes } = await import('./democracy');
    const result = await castVotes('user-uuid', [1, 2]);

    expect(result.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('consultation_votes');
  });

  it('createConsultationTransaction calls RPC with clean payload', async () => {
    mockRpc.mockResolvedValue({ data: { id: 99 }, error: null });

    const payload = {
      p_quartier_id: 1,
      p_title: 'Test',
      p_question: 'Question?',
      p_options: ['A', 'B'],
      p_summary: null,
      p_description: null,
      p_cover_image: null,
      p_multiple_choices: false,
    };

    const { createConsultationTransaction } = await import('./democracy');
    const result = await createConsultationTransaction(payload);

    expect(mockRpc).toHaveBeenCalledWith('create_consultation_transaction', payload);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ id: 99 });
  });

  it('getAllSondagesByQuartier returns RPC groups on success', async () => {
    const payload = [
      {
        quartier_nom: 'Centre',
        sondages: [
          {
            id: 1,
            title: 'Sondage A',
            description: 'Desc',
            options: [
              { text: 'Oui', votes: 3 },
              { text: 'Non', votes: 1 },
            ],
          },
        ],
      },
    ];
    mockRpc.mockResolvedValue({ data: payload, error: null });

    const { getAllSondagesByQuartier } = await import('./democracy');
    const result = await getAllSondagesByQuartier();

    expect(mockRpc).toHaveBeenCalledWith('get_all_sondages_by_quartier');
    expect(result).toEqual(payload);
  });

  it('getAllSondagesByQuartier returns [] on RPC error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    });

    const { getAllSondagesByQuartier } = await import('./democracy');
    const result = await getAllSondagesByQuartier();

    expect(result).toEqual([]);
  });

  it('getAllSondagesByQuartier returns [] when data is null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { getAllSondagesByQuartier } = await import('./democracy');
    const result = await getAllSondagesByQuartier();

    expect(result).toEqual([]);
  });

  it('totalSondageVotes sums option votes', async () => {
    const { totalSondageVotes } = await import('./democracy');
    expect(
      totalSondageVotes({
        options: [
          { text: 'A', votes: 2 },
          { text: 'B', votes: 5 },
        ],
      }),
    ).toBe(7);
  });

  it('totalSondageVotes returns 0 for empty options', async () => {
    const { totalSondageVotes } = await import('./democracy');
    expect(totalSondageVotes({ options: [] })).toBe(0);
  });

  it('calculateSondagePercentage returns 0 when total is 0', async () => {
    const { calculateSondagePercentage } = await import('./democracy');
    expect(calculateSondagePercentage(5, 0)).toBe(0);
    expect(calculateSondagePercentage(0, 0)).toBe(0);
  });

  it('calculateSondagePercentage matches Vue formula (no rounding)', async () => {
    const { calculateSondagePercentage } = await import('./democracy');
    expect(calculateSondagePercentage(1, 3)).toBeCloseTo(33.333333, 5);
    expect(calculateSondagePercentage(2, 4)).toBe(50);
    expect(calculateSondagePercentage(0, 10)).toBe(0);
  });
});
