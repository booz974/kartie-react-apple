import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

function createQueryBuilder(result: { data?: unknown; error?: unknown; count?: number | null }) {
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

describe('associations api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('normalizeAssociation coerces activities, audiences and social_links', async () => {
    const { normalizeAssociation } = await import('./associations');
    const result = normalizeAssociation({
      id: 1,
      name: 'Test',
      status: 'active',
      activities: null,
      audiences: ['Seniors'],
      social_links: { facebook: 'https://fb.com/x' },
    });

    expect(result?.activities).toEqual([]);
    expect(result?.audiences).toEqual(['Seniors']);
    expect(result?.social_links).toEqual({ facebook: 'https://fb.com/x' });
    expect(result?.is_publicly_visible).toBe(true);
    expect(result?.category_label).toBe('Autre');
  });

  it('normalizeAssociationPost falls back to metadata title and image', async () => {
    const { normalizeAssociationPost } = await import('./associations');
    const result = normalizeAssociationPost({
      id: 3,
      association_id: 1,
      status: 'published',
      metadata: { association_post_title: 'Titre meta', image_url: 'img.png' },
    });

    expect(result?.title).toBe('Titre meta');
    expect(result?.image_url).toBe('img.png');
  });

  it('normalizeAssociationEvent builds display_date and location fallback', async () => {
    const { normalizeAssociationEvent } = await import('./associations');
    const result = normalizeAssociationEvent({
      id: 5,
      association_id: 1,
      title: 'Soirée',
      status: 'published',
      start_at: '2026-08-01T18:00:00.000Z',
      association: { id: 1, name: 'Club', slug: 'club', logo_url: 'logo.png' },
    });

    expect(result?.display_date).toBeTruthy();
    expect(result?.location).toBe('Lieu à préciser');
    expect(result?.routePath).toBe('/associations/events/5');
  });

  it('slugifyAssociationName normalizes accents and spaces', async () => {
    const { slugifyAssociationName } = await import('./associations');
    expect(slugifyAssociationName('Club Événement 2026')).toBe('club-evenement-2026');
  });

  it('getAssociationByIdentifier queries by numeric id', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: { id: 2, name: 'Book Club', status: 'active', category: 'culture' },
        error: null,
      }),
    );

    const { getAssociationByIdentifier } = await import('./associations');
    const association = await getAssociationByIdentifier('2');

    expect(mockFrom).toHaveBeenCalledWith('associations');
    expect(association?.name).toBe('Book Club');
  });

  it('getAssociationByIdentifier queries by slug', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: { id: 2, name: 'Book Club', slug: 'book-club', status: 'active' },
        error: null,
      }),
    );

    const { getAssociationByIdentifier } = await import('./associations');
    await getAssociationByIdentifier('book-club');

    expect(mockFrom).toHaveBeenCalledWith('associations');
  });

  it('getQuartierAssociations filters active when includeManaged is false', async () => {
    let associationsCall = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'associations') {
        associationsCall += 1;
        return createQueryBuilder({
          data: [{ id: 1, name: 'A', status: 'active', category: 'sport' }],
          error: null,
        });
      }
      if (table === 'association_follows') {
        return createQueryBuilder({ count: 0, error: null });
      }
      return createQueryBuilder({ data: [], error: null });
    });

    const { getQuartierAssociations } = await import('./associations');
    const list = await getQuartierAssociations(1, { includeManaged: false });

    expect(associationsCall).toBeGreaterThan(0);
    expect(list).toHaveLength(1);
    expect(list[0].followers_count).toBe(0);
  });

  it('getAssociationPosts filters published by default', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: [{ id: 10, association_id: 1, status: 'published', title: 'Hello', metadata: {} }],
        error: null,
      }),
    );

    const { getAssociationPosts } = await import('./associations');
    const posts = await getAssociationPosts(1);

    expect(mockFrom).toHaveBeenCalledWith('association_posts');
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Hello');
  });

  it('followAssociation upserts association_follows row', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: null }));

    const { followAssociation } = await import('./associations');
    const result = await followAssociation(2, 'user-uuid');

    expect(result.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('association_follows');
  });

  it('unfollowAssociation deletes association_follows row', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: null }));

    const { unfollowAssociation } = await import('./associations');
    const result = await unfollowAssociation(2, 'user-uuid');

    expect(result.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('association_follows');
  });

  it('followAssociation returns failure when context missing', async () => {
    const { followAssociation } = await import('./associations');
    const result = await followAssociation(0, '');
    expect(result.success).toBe(false);
  });

  it('createAssociation succeeds on first attempt', async () => {
    mockRpc.mockResolvedValue({ data: 42, error: null });

    const { createAssociation } = await import('./associations');
    const result = await createAssociation({
      quartier_id: 1,
      name: 'Club Test',
      slug: 'club-test',
      short_description: 'Description assez longue',
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.associationId).toBe(42);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith(
      'create_association_transaction',
      expect.objectContaining({
        p_quartier_id: 1,
        p_name: 'Club Test',
        p_slug: 'club-test',
        p_short_description: 'Description assez longue',
      }),
    );
  });

  it('createAssociation retries on slug collision then succeeds', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'duplicate key value violates unique constraint "idx_associations_slug_unique"' },
      })
      .mockResolvedValueOnce({ data: 99, error: null });

    const { createAssociation } = await import('./associations');
    const result = await createAssociation({
      quartier_id: 1,
      name: 'Club Test',
      slug: 'club-test',
      short_description: 'Description assez longue',
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.associationId).toBe(99);
    expect(mockRpc).toHaveBeenCalledTimes(2);
    const secondSlug = (mockRpc.mock.calls[1][1] as { p_slug: string }).p_slug;
    expect(secondSlug).toMatch(/^club-test-[a-z0-9]+$/);
  });

  it('createAssociation fails after max slug retries', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "idx_associations_slug_unique"' },
    });

    const { createAssociation } = await import('./associations');
    const result = await createAssociation({
      quartier_id: 1,
      name: 'Club Test',
      slug: 'club-test',
      short_description: 'Description assez longue',
    });

    expect(result.success).toBe(false);
    expect(mockRpc).toHaveBeenCalledTimes(3);
  });

  it('updateAssociation sets updated_at and refreshes mirrors', async () => {
    const updateResult = {
      data: {
        id: 7,
        name: 'Updated',
        status: 'active',
        short_description: 'Nouvelle description',
        activities: [],
        audiences: [],
        social_links: {},
      },
      error: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'associations') {
        return createQueryBuilder(updateResult);
      }
      if (table === 'association_posts' || table === 'association_events') {
        return createQueryBuilder({ data: [{ id: 1 }], error: null });
      }
      return createQueryBuilder({ data: [], error: null });
    });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { updateAssociation } = await import('./associations');
    const result = await updateAssociation(7, {
      name: 'Updated',
      short_description: 'Nouvelle description',
      status: 'active',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Updated');
    }
    expect(mockFrom).toHaveBeenCalledWith('associations');
    expect(mockFrom).toHaveBeenCalledWith('association_posts');
    expect(mockFrom).toHaveBeenCalledWith('association_events');
    expect(mockRpc).toHaveBeenCalledWith('sync_association_post_feed', {
      p_association_post_id: 1,
    });
    expect(mockRpc).toHaveBeenCalledWith('sync_association_event_feed', {
      p_association_event_id: 1,
    });
  });

  it('createAssociation does not call mirror sync RPCs', async () => {
    mockRpc.mockResolvedValue({ data: 11, error: null });

    const { createAssociation } = await import('./associations');
    await createAssociation({
      quartier_id: 1,
      name: 'No Mirror',
      slug: 'no-mirror',
      short_description: 'Description assez longue',
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc.mock.calls[0][0]).toBe('create_association_transaction');
  });

  it('createAssociationPost inserts draft without calling sync RPC', async () => {
    const insertResult = {
      data: {
        id: 10,
        association_id: 5,
        quartier_id: 1,
        title: 'Draft title',
        content: 'Hello draft',
        status: 'draft',
        image_url: null,
        metadata: {},
        published_at: null,
      },
      error: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'association_posts') {
        return createQueryBuilder(insertResult);
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { createAssociationPost } = await import('./associations');
    const result = await createAssociationPost(
      {
        association_id: 5,
        quartier_id: 1,
        title: 'Draft title',
        content: 'Hello draft',
        status: 'draft',
      },
      'user-1',
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('draft');
      expect(result.data.content).toBe('Hello draft');
    }
    expect(mockFrom).toHaveBeenCalledWith('association_posts');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('createAssociationPost sets published_at and metadata image without sync RPC', async () => {
    const insertResult = {
      data: {
        id: 11,
        association_id: 5,
        quartier_id: 1,
        title: 'Pub',
        content: 'Published body',
        status: 'published',
        image_url: 'https://example.com/a.png',
        metadata: { image_url: 'https://example.com/a.png' },
        published_at: '2026-07-09T12:00:00.000Z',
      },
      error: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'association_posts') {
        return createQueryBuilder(insertResult);
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { createAssociationPost } = await import('./associations');
    const result = await createAssociationPost(
      {
        association_id: 5,
        quartier_id: 1,
        title: 'Pub',
        content: 'Published body',
        status: 'published',
        image_url: 'https://example.com/a.png',
        metadata: { image_url: 'https://example.com/a.png' },
      },
      'user-1',
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('published');
      expect(result.data.image_url).toBe('https://example.com/a.png');
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('updateAssociationPost publishes and archives without sync RPC', async () => {
    const updateResult = {
      data: {
        id: 12,
        association_id: 5,
        title: 'Edited',
        content: 'Updated content',
        status: 'published',
        published_at: '2026-07-09T13:00:00.000Z',
        metadata: {},
      },
      error: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'association_posts') {
        return createQueryBuilder(updateResult);
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { updateAssociationPost } = await import('./associations');
    const published = await updateAssociationPost(
      12,
      { title: 'Edited', content: 'Updated content', status: 'published' },
      'user-1',
    );

    expect(published.success).toBe(true);
    if (published.success) expect(published.data.status).toBe('published');
    expect(mockRpc).not.toHaveBeenCalled();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'association_posts') {
        return createQueryBuilder({
          data: { ...updateResult.data, status: 'archived' },
          error: null,
        });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const archived = await updateAssociationPost(12, { status: 'archived' }, 'user-1');
    expect(archived.success).toBe(true);
    if (archived.success) expect(archived.data.status).toBe('archived');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('removeAssociationPost sets removed and deleted_at without sync RPC', async () => {
    const updateResult = {
      data: {
        id: 13,
        association_id: 5,
        content: 'Gone',
        status: 'removed',
        deleted_at: '2026-07-09T14:00:00.000Z',
        metadata: {},
      },
      error: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'association_posts') {
        return createQueryBuilder(updateResult);
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { removeAssociationPost } = await import('./associations');
    const result = await removeAssociationPost(13, 'user-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('removed');
      expect(result.data.deleted_at).toBeTruthy();
    }
    expect(mockFrom).toHaveBeenCalledWith('association_posts');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('createAssociationEvent inserts draft without calling sync RPC', async () => {
    const insertResult = {
      data: {
        id: 20,
        association_id: 5,
        quartier_id: 1,
        title: 'Draft event',
        description: 'Hello draft event',
        status: 'draft',
        start_at: '2026-08-01T18:00:00.000Z',
        published_at: null,
        metadata: {},
        association: { id: 5, name: 'Club', slug: 'club', logo_url: null, is_verified: false, status: 'active' },
      },
      error: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'association_events') {
        return createQueryBuilder(insertResult);
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { createAssociationEvent } = await import('./associations');
    const result = await createAssociationEvent(
      {
        association_id: 5,
        quartier_id: 1,
        title: 'Draft event',
        description: 'Hello draft event',
        start_at: '2026-08-01T18:00:00.000Z',
        status: 'draft',
      },
      'user-1',
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('draft');
      expect(result.data.title).toBe('Draft event');
    }
    expect(mockFrom).toHaveBeenCalledWith('association_events');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('createAssociationEvent sets published_at without sync RPC', async () => {
    const insertResult = {
      data: {
        id: 21,
        association_id: 5,
        title: 'Pub event',
        description: 'Published event',
        status: 'published',
        start_at: '2026-08-01T18:00:00.000Z',
        published_at: '2026-07-09T12:00:00.000Z',
        metadata: {},
        association: { id: 5, name: 'Club', slug: 'club' },
      },
      error: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'association_events') {
        return createQueryBuilder(insertResult);
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { createAssociationEvent } = await import('./associations');
    const result = await createAssociationEvent(
      {
        association_id: 5,
        quartier_id: 1,
        title: 'Pub event',
        description: 'Published event',
        start_at: '2026-08-01T18:00:00.000Z',
        status: 'published',
      },
      'user-1',
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('published');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('updateAssociationEvent cancel/archive and removeAssociationEvent without sync RPC', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'association_events') {
        return createQueryBuilder({
          data: {
            id: 22,
            association_id: 5,
            title: 'Evt',
            description: 'Desc',
            status: 'cancelled',
            start_at: '2026-08-01T18:00:00.000Z',
            metadata: {},
            association: { id: 5, name: 'Club', slug: 'club' },
          },
          error: null,
        });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { updateAssociationEvent, removeAssociationEvent } = await import('./associations');
    const cancelled = await updateAssociationEvent(22, { status: 'cancelled' }, 'user-1');
    expect(cancelled.success).toBe(true);
    if (cancelled.success) expect(cancelled.data.status).toBe('cancelled');
    expect(mockRpc).not.toHaveBeenCalled();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'association_events') {
        return createQueryBuilder({
          data: {
            id: 22,
            association_id: 5,
            title: 'Evt',
            description: 'Desc',
            status: 'removed',
            deleted_at: '2026-07-09T14:00:00.000Z',
            start_at: '2026-08-01T18:00:00.000Z',
            metadata: {},
            association: { id: 5, name: 'Club', slug: 'club' },
          },
          error: null,
        });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const removed = await removeAssociationEvent(22, 'user-1');
    expect(removed.success).toBe(true);
    if (removed.success) {
      expect(removed.data.status).toBe('removed');
      expect(removed.data.deleted_at).toBeTruthy();
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('getAssociationsForAdminReview returns normalized list with quartier', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'associations') {
        return createQueryBuilder({
          data: [
            {
              id: 9,
              name: 'Pending Club',
              status: 'pending',
              category: 'sport',
              activities: null,
              audiences: null,
              social_links: null,
              quartier: { id: 1, name: 'Centre' },
            },
          ],
          error: null,
        });
      }
      if (table === 'association_follows') {
        return createQueryBuilder({ count: 2, error: null });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { getAssociationsForAdminReview } = await import('./associations');
    const list = await getAssociationsForAdminReview();
    expect(list).toHaveLength(1);
    expect(list[0].status_label).toBe('En attente');
    expect(list[0].category_label).toBe('Sport');
    expect(list[0].quartier?.name).toBe('Centre');
    expect(list[0].followers_count).toBe(2);
  });

  it('getAssociationsForAdminReview returns [] on error', async () => {
    mockFrom.mockImplementation(() =>
      createQueryBuilder({ data: null, error: { message: 'denied' } }),
    );

    const { getAssociationsForAdminReview } = await import('./associations');
    const list = await getAssociationsForAdminReview({ status: 'pending' });
    expect(list).toEqual([]);
  });

  it('logModerationAction inserts moderation_logs without inventing fields', async () => {
    const insert = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    );
    mockFrom.mockImplementation((table: string) => {
      if (table === 'moderation_logs') {
        return { insert };
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { logModerationAction } = await import('./associations');
    const result = await logModerationAction({
      entityType: 'association',
      entityId: 42,
      action: 'status:active',
      performedBy: 'admin-1',
    });

    expect(result.success).toBe(true);
    expect(insert).toHaveBeenCalledWith({
      entity_type: 'association',
      entity_id: 42,
      action: 'status:active',
      reason: null,
      performed_by: 'admin-1',
    });
  });

  it('logModerationAction returns failure on insert error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'moderation_logs') {
        return {
          insert: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: 'rls' } }),
          ),
        };
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { logModerationAction } = await import('./associations');
    const result = await logModerationAction({
      entityType: 'association',
      entityId: 1,
      action: 'status:rejected',
    });
    expect(result.success).toBe(false);
  });

  it('getAssociationDashboardData loads association posts events membership', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'associations') {
        return createQueryBuilder({
          data: { id: 5, name: 'Dash', status: 'pending', activities: [], audiences: [], social_links: {} },
          error: null,
        });
      }
      if (table === 'association_posts') {
        return createQueryBuilder({ data: [], error: null });
      }
      if (table === 'association_events') {
        return createQueryBuilder({ data: [], error: null });
      }
      if (table === 'association_members') {
        return createQueryBuilder({
          data: { id: 1, association_id: 5, user_id: 'u1', role: 'owner' },
          error: null,
        });
      }
      if (table === 'association_follows') {
        return createQueryBuilder({ count: 0, error: null });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const { getAssociationDashboardData } = await import('./associations');
    const dashboard = await getAssociationDashboardData(5, 'u1');

    expect(dashboard.association?.name).toBe('Dash');
    expect(dashboard.membership?.role).toBe('owner');
    expect(dashboard.posts).toEqual([]);
    expect(dashboard.events).toEqual([]);
  });
});
