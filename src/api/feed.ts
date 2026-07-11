import { supabase } from '@/lib/supabase';
import type { FeedComment, FeedPost } from '@/lib/types/contract';

type ProfileEmbed = {
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
};

export function formatUser(profile: ProfileEmbed | null | undefined): {
  name: string;
  avatar: string | null;
} {
  if (!profile) return { name: 'Utilisateur', avatar: null };
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Utilisateur';
  return { name, avatar: profile.avatar_url ?? null };
}

export function formatPost(post: Record<string, unknown> | null | undefined): FeedPost | null {
  if (!post) return null;
  const p = { ...post } as FeedPost & { author?: unknown; comments?: unknown[] };

  if (p.author && typeof p.author === 'object') {
    const { name, avatar } = formatUser(p.author as ProfileEmbed);
    p.author = name;
    p.avatar = avatar;
  }

  if (p.comments) {
    p.comments = (p.comments as Record<string, unknown>[]).map((c) => {
      const comment = { ...c } as unknown as FeedComment & { author?: unknown };
      if (comment.author && typeof comment.author === 'object') {
        const { name, avatar } = formatUser(comment.author as ProfileEmbed);
        comment.author = name;
        comment.avatar = avatar;
      }
      return comment;
    });
  }

  return p as FeedPost;
}

const FEED_SELECT = `
  *,
  author:profiles!author_id(first_name, last_name, avatar_url),
  comments:feed_comments(*, author:profiles!author_id(first_name, last_name, avatar_url)),
  reactions:feed_post_reactions(*)
`;

export async function fetchFeedPosts(quartierId: number): Promise<FeedPost[]> {
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .select(FEED_SELECT)
      .eq('quartier_id', quartierId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((post) => formatPost(post as Record<string, unknown>)).filter(Boolean) as FeedPost[];
  } catch (err) {
    console.error('Error fetching feed posts:', err);
    return [];
  }
}

export async function createPost(
  postData: Record<string, unknown>,
): Promise<{ data: FeedPost | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .insert(postData)
      .select('*, author:profiles!author_id(first_name, last_name, avatar_url)')
      .single();

    if (error) throw error;
    return { data: formatPost(data as Record<string, unknown>), error: null };
  } catch (err) {
    console.error('Error creating post:', err);
    return { data: null, error: err };
  }
}

export async function addComment(
  commentData: Record<string, unknown>,
): Promise<{ data: FeedComment | null; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('feed_comments')
      .insert(commentData)
      .select('*, author:profiles!author_id(first_name, last_name, avatar_url)')
      .single();

    if (error) throw error;
    const formatted = formatPost(data as Record<string, unknown>);
    return { data: formatted as unknown as FeedComment, error: null };
  } catch (err) {
    console.error('Error adding comment:', err);
    return { data: null, error: err };
  }
}

export type ToggleReactionResult =
  | { action: 'removed' }
  | { action: 'added' }
  | { error: unknown };

export async function toggleReaction(
  postId: number,
  userId: string,
  type: string,
): Promise<ToggleReactionResult> {
  try {
    const { data: existing } = await supabase
      .from('feed_post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabase.from('feed_post_reactions').delete().eq('id', existing.id);
      return { action: 'removed' };
    }

    await supabase.from('feed_post_reactions').insert({
      post_id: postId,
      user_id: userId,
      reaction_type: type,
    });
    return { action: 'added' };
  } catch (err) {
    console.error('Error toggling reaction:', err);
    return { error: err };
  }
}
