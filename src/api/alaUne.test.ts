import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

import {
  buildAlaUnePayload,
  mapAlaUneRowToFormValues,
  type AlaUneFormValues,
} from './alaUne';

function createQueryBuilder(result: { data?: unknown; error?: unknown }) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop) {
      if (prop === 'then') {
        return (
          onFulfilled: (value: typeof result) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => Promise.resolve(result).then(onFulfilled, onRejected);
      }
      if (!(prop in target)) {
        target[prop as string] = vi.fn(() => new Proxy(target, handler));
      }
      return target[prop as string];
    },
  };

  return new Proxy<Record<string, unknown>>({}, handler);
}

const baseForm = (): AlaUneFormValues => ({
  type: 'article',
  title: 'Titre',
  content: 'Contenu',
  image_url: 'https://example.com/img.png',
  event_date: '',
  location: '',
  sondage_options: [{ text: '', votes: 0 }],
  is_active: true,
});

describe('alaUne api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('fetchAlaUneContent returns active content payload', async () => {
    const payload = [
      {
        id: 1,
        type: 'article',
        title: 'Titre',
        content: 'Contenu',
        is_active: true,
      },
      {
        id: 2,
        type: 'sondage',
        title: 'Question ?',
        sondage_options: [{ option_text: 'Oui', vote_count: 0 }],
      },
    ];
    mockFrom.mockReturnValue(createQueryBuilder({ data: payload, error: null }));

    const { fetchAlaUneContent } = await import('./alaUne');
    const result = await fetchAlaUneContent();

    expect(mockFrom).toHaveBeenCalledWith('ala_une_content');
    expect(result).toEqual(payload);
  });

  it('fetchAlaUneContent returns [] on error', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: new Error('db') }));

    const { fetchAlaUneContent } = await import('./alaUne');
    const result = await fetchAlaUneContent();

    expect(result).toEqual([]);
  });

  it('fetchAllAlaUneContent lists all rows for admin', async () => {
    const payload = [{ id: 1, type: 'flash_info', content: 'Flash', is_active: false }];
    mockFrom.mockReturnValue(createQueryBuilder({ data: payload, error: null }));

    const { fetchAllAlaUneContent } = await import('./alaUne');
    const result = await fetchAllAlaUneContent();

    expect(mockFrom).toHaveBeenCalledWith('ala_une_content');
    expect(result).toEqual(payload);
  });

  it('getUserAlaUneVote returns vote row payload', async () => {
    const payload = { id: 7, user_id: 'user-1', ala_une_content_id: 2 };
    mockFrom.mockReturnValue(createQueryBuilder({ data: payload, error: null }));

    const { getUserAlaUneVote } = await import('./alaUne');
    const result = await getUserAlaUneVote('user-1', 2);

    expect(mockFrom).toHaveBeenCalledWith('user_ala_une_votes');
    expect(result).toEqual(payload);
  });

  it('castAlaUneVote calls increment_ala_une_vote RPC then inserts vote', async () => {
    let voteTableCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_ala_une_votes') {
        voteTableCalls += 1;
        if (voteTableCalls === 1) {
          return createQueryBuilder({ data: null, error: null });
        }
        return createQueryBuilder({ data: null, error: null });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    mockRpc.mockResolvedValue({ error: null });

    const { castAlaUneVote } = await import('./alaUne');
    const result = await castAlaUneVote({
      userId: 'user-1',
      sondageId: 2,
      optionId: 0,
    });

    expect(mockRpc).toHaveBeenCalledWith('increment_ala_une_vote', {
      p_ala_une_id: 2,
      p_option_index: 0,
    });
    expect(result).toEqual({ success: true });
  });

  it('castAlaUneVote rejects duplicate vote', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: { id: 1, user_id: 'user-1', ala_une_content_id: 2 },
        error: null,
      }),
    );

    const { castAlaUneVote } = await import('./alaUne');
    const result = await castAlaUneVote({
      userId: 'user-1',
      sondageId: 2,
      optionId: 1,
    });

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it('createAlaUneContent inserts payload', async () => {
    const created = { id: 9, type: 'article', title: 'Nouvel' };
    mockFrom.mockReturnValue(createQueryBuilder({ data: created, error: null }));

    const { createAlaUneContent } = await import('./alaUne');
    const result = await createAlaUneContent({ type: 'article', title: 'Nouvel' });

    expect(mockFrom).toHaveBeenCalledWith('ala_une_content');
    expect(result).toEqual(created);
  });

  it('deleteAlaUneContent hard-deletes by id', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: null }));

    const { deleteAlaUneContent } = await import('./alaUne');
    await deleteAlaUneContent(42);

    expect(mockFrom).toHaveBeenCalledWith('ala_une_content');
  });

  it('deleteAlaUneContent throws on error', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({ data: null, error: new Error('forbidden') }),
    );

    const { deleteAlaUneContent } = await import('./alaUne');
    await expect(deleteAlaUneContent(42)).rejects.toThrow('forbidden');
  });
});

describe('buildAlaUnePayload', () => {
  it('strips event/sondage fields for article', () => {
    const payload = buildAlaUnePayload({
      ...baseForm(),
      type: 'article',
      event_date: '2026-01-01T10:00',
      location: 'Place',
      sondage_options: [{ text: 'A', votes: 1 }],
    });

    expect(payload).toEqual({
      type: 'article',
      title: 'Titre',
      content: 'Contenu',
      image_url: 'https://example.com/img.png',
      is_active: true,
    });
  });

  it('keeps event fields and ISO date for event', () => {
    const payload = buildAlaUnePayload({
      ...baseForm(),
      type: 'event',
      event_date: '2026-07-10T14:30',
      location: 'Mairie',
    });

    expect(payload.type).toBe('event');
    expect(payload.location).toBe('Mairie');
    expect(payload.sondage_options).toBeUndefined();
    expect(typeof payload.event_date).toBe('string');
    expect(String(payload.event_date)).toContain('2026');
  });

  it('maps sondage options and drops empty ones', () => {
    const payload = buildAlaUnePayload({
      ...baseForm(),
      type: 'sondage',
      title: 'Question ?',
      sondage_options: [
        { text: 'Oui', votes: 2 },
        { text: '  ', votes: 0 },
        { text: 'Non', votes: 0 },
      ],
    });

    expect(payload).toEqual({
      type: 'sondage',
      title: 'Question ?',
      is_active: true,
      sondage_options: [
        { option_text: 'Oui', vote_count: 2 },
        { option_text: 'Non', vote_count: 0 },
      ],
    });
  });

  it('strips title/image for flash_info', () => {
    const payload = buildAlaUnePayload({
      ...baseForm(),
      type: 'flash_info',
      content: 'Alerte météo',
    });

    expect(payload).toEqual({
      type: 'flash_info',
      content: 'Alerte météo',
      is_active: true,
    });
  });
});

describe('mapAlaUneRowToFormValues', () => {
  it('maps persisted sondage options to draft text/votes', () => {
    const form = mapAlaUneRowToFormValues({
      id: 3,
      type: 'sondage',
      title: 'Q',
      is_active: true,
      sondage_options: [
        { option_text: 'A', vote_count: 5 },
        { option_text: 'B', vote_count: 1 },
      ],
    });

    expect(form.sondage_options).toEqual([
      { text: 'A', votes: 5 },
      { text: 'B', votes: 1 },
    ]);
    expect(form.id).toBe(3);
  });

  it('defaults empty create form', () => {
    const form = mapAlaUneRowToFormValues(null);
    expect(form.type).toBe('article');
    expect(form.is_active).toBe(true);
    expect(form.sondage_options).toEqual([{ text: '', votes: 0 }]);
  });
});
