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

describe('feed api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('formatUser returns Utilisateur when profile is missing', async () => {
    const { formatUser } = await import('./feed');
    expect(formatUser(null)).toEqual({ name: 'Utilisateur', avatar: null });
  });

  it('formatUser builds name from first and last name', async () => {
    const { formatUser } = await import('./feed');
    expect(formatUser({ first_name: 'Jean', last_name: 'Dupont', avatar_url: 'https://x/a.png' })).toEqual({
      name: 'Jean Dupont',
      avatar: 'https://x/a.png',
    });
  });

  it('formatPost flattens author and comment authors', async () => {
    const { formatPost } = await import('./feed');
    const result = formatPost({
      id: 1,
      author: { first_name: 'A', last_name: 'B', avatar_url: 'av.png' },
      comments: [{ id: 2, author: { first_name: 'C', last_name: 'D', avatar_url: null }, content: 'hi' }],
    });

    expect(result?.author).toBe('A B');
    expect(result?.avatar).toBe('av.png');
    expect(result?.comments[0].author).toBe('C D');
  });

  it('fetchFeedPosts returns formatted posts on success', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: [
          {
            id: 7,
            author: { first_name: 'Test', last_name: 'User', avatar_url: null },
            comments: [],
            reactions: [],
          },
        ],
        error: null,
      }),
    );

    const { fetchFeedPosts } = await import('./feed');
    const posts = await fetchFeedPosts(1);

    expect(mockFrom).toHaveBeenCalledWith('feed_posts');
    expect(posts).toHaveLength(1);
    expect(posts[0].author).toBe('Test User');
  });

  it('fetchFeedPosts returns empty array on error', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: new Error('fail') }));

    const { fetchFeedPosts } = await import('./feed');
    const posts = await fetchFeedPosts(1);

    expect(posts).toEqual([]);
  });

  it('toggleReaction removes existing reaction (D-15 delete-any)', async () => {
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    let callIndex = 0;

    mockFrom.mockImplementation(() => {
      callIndex += 1;
      if (callIndex === 1) {
        return createQueryBuilder({ data: { id: 99 }, error: null });
      }
      return {
        delete: vi.fn(() => ({ eq: deleteEq })),
      };
    });

    const { toggleReaction } = await import('./feed');
    const result = await toggleReaction(7, 'user-1', 'like');

    expect(result).toEqual({ action: 'removed' });
    expect(deleteEq).toHaveBeenCalledWith('id', 99);
  });

  it('toggleReaction inserts when no existing reaction', async () => {
    let callIndex = 0;

    mockFrom.mockImplementation(() => {
      callIndex += 1;
      if (callIndex === 1) {
        return createQueryBuilder({ data: null, error: { code: 'PGRST116' } });
      }
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    const { toggleReaction } = await import('./feed');
    const result = await toggleReaction(7, 'user-1', 'pray');

    expect(result).toEqual({ action: 'added' });
  });

  it('createPost inserts and returns formatted post', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: {
          id: 42,
          content: 'Hello',
          author: { first_name: 'Jean', last_name: 'Dupont', avatar_url: null },
        },
        error: null,
      }),
    );

    const { createPost } = await import('./feed');
    const { data, error } = await createPost({
      content: 'Hello',
      post_type: 'regular',
      metadata: { image_url: 'https://cdn/x.jpg' },
      quartier_id: 1,
      user_id: 'u1',
    });

    expect(error).toBeNull();
    expect(data?.author).toBe('Jean Dupont');
    expect(mockFrom).toHaveBeenCalledWith('feed_posts');
  });

  it('createPost returns error on insert failure', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({ data: null, error: new Error('insert failed') }),
    );

    const { createPost } = await import('./feed');
    const { data, error } = await createPost({ content: 'x' });

    expect(data).toBeNull();
    expect(error).toBeTruthy();
  });

  it('addComment inserts root comment', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: {
          id: 5,
          content: 'Nice',
          author: { first_name: 'A', last_name: 'B', avatar_url: null },
        },
        error: null,
      }),
    );

    const { addComment } = await import('./feed');
    const { data, error } = await addComment({
      content: 'Nice',
      post_id: 7,
      parent_id: null,
      user_id: 'u1',
    });

    expect(error).toBeNull();
    expect(data?.content).toBe('Nice');
    expect(mockFrom).toHaveBeenCalledWith('feed_comments');
  });

  it('addComment inserts reply with parent_id', async () => {
    mockFrom.mockReturnValue(
      createQueryBuilder({
        data: {
          id: 6,
          content: 'Reply',
          parent_id: 5,
          author: { first_name: 'C', last_name: 'D', avatar_url: null },
        },
        error: null,
      }),
    );

    const { addComment } = await import('./feed');
    const { data } = await addComment({
      content: 'Reply',
      post_id: 7,
      parent_id: 5,
      user_id: 'u1',
    });

    expect(data?.content).toBe('Reply');
  });
});
