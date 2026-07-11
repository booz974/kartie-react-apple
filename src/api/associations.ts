import { supabase } from '@/lib/supabase';
import type {
  Association,
  AssociationAgendaEvent,
  AssociationEvent,
  AssociationMembership,
  AssociationPost,
} from '@/lib/types/contract';
import { formatEventDate } from '@/utils/dateFormatter';

export const ASSOCIATION_CATEGORIES = [
  { value: 'sport', label: 'Sport' },
  { value: 'culture', label: 'Culture' },
  { value: 'social_solidarity', label: 'Social / Solidarité' },
  { value: 'youth', label: 'Jeunesse' },
  { value: 'seniors', label: 'Seniors' },
  { value: 'environment', label: 'Environnement' },
  { value: 'education', label: 'Éducation' },
  { value: 'insertion', label: 'Insertion' },
  { value: 'health_wellbeing', label: 'Santé / Bien-être' },
  { value: 'other', label: 'Autre' },
] as const;

export const ASSOCIATION_STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspendue' },
  { value: 'rejected', label: 'Refusée' },
] as const;

export const ASSOCIATION_POST_STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
  { value: 'archived', label: 'Archivé' },
  { value: 'removed', label: 'Retiré' },
] as const;

export const ASSOCIATION_EVENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'archived', label: 'Archivé' },
  { value: 'removed', label: 'Retiré' },
] as const;

export interface QuartierAssociationsFilters {
  category?: string;
  status?: string;
  search?: string;
  includeManaged?: boolean;
}

function normalizeIdentifier(identifier: string | number | null | undefined): string | null {
  if (identifier === null || identifier === undefined) return null;
  return String(identifier).trim();
}

function isNumericIdentifier(value: string | null): boolean {
  return /^\d+$/.test(value || '');
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function slugifyAssociationName(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

export function getAssociationCategoryLabel(category: string | null | undefined): string {
  return ASSOCIATION_CATEGORIES.find((item) => item.value === category)?.label ?? 'Autre';
}

export function getAssociationStatusLabel(status: string | null | undefined): string {
  return ASSOCIATION_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status ?? '';
}

export function normalizeAssociation(row: Record<string, unknown> | null): Association | null {
  if (!row) return null;

  return {
    ...(row as Association),
    activities: safeArray(row.activities),
    audiences: safeArray(row.audiences),
    social_links: safeObject(row.social_links),
    category_label: getAssociationCategoryLabel(row.category as string | undefined),
    status_label: getAssociationStatusLabel(row.status as string | undefined),
    is_publicly_visible: row.status === 'active' && !row.deleted_at,
    followers_count: (row.followers_count as number) || 0,
    quartier: (row.quartier as Association['quartier']) || null,
  };
}

export function normalizeAssociationPost(row: Record<string, unknown> | null): AssociationPost | null {
  if (!row) return null;

  const metadata = safeObject(row.metadata);

  return {
    ...(row as AssociationPost),
    metadata,
    title: (row.title as string) || (metadata.association_post_title as string) || '',
    image_url: (row.image_url as string) || (metadata.image_url as string) || null,
  };
}

export function normalizeAssociationEvent(row: Record<string, unknown> | null): AssociationEvent | null {
  if (!row) return null;

  const metadata = safeObject(row.metadata);
  const association = (row.association as Association | null) ?? null;
  const location =
    (row.location_text as string) ||
    (metadata.location_text as string) ||
    'Lieu à préciser';

  return {
    ...(row as AssociationEvent),
    metadata,
    association,
    image_url:
      (row.image_url as string) ||
      (metadata.image_url as string) ||
      (association?.logo_url as string | null | undefined) ||
      null,
    display_date: formatEventDate(row.start_at as string),
    location,
    routePath: `/associations/events/${row.id}`,
    source: 'association',
  };
}

export function normalizeAssociationEventForAgenda(
  row: Record<string, unknown> | null,
): AssociationAgendaEvent | null {
  const event = normalizeAssociationEvent(row);
  if (!event) return null;

  const metadata = event.metadata as Record<string, unknown> | undefined;

  return {
    id: `association-${event.id}`,
    original_id: event.id,
    source: 'association',
    title: event.title,
    date: event.display_date ?? '',
    location: event.location ?? 'Lieu à préciser',
    image: event.image_url ?? null,
    routePath: event.routePath ?? `/associations/events/${event.id}`,
    association_name:
      event.association?.name ||
      (metadata?.association_name as string) ||
      '',
    association_slug:
      event.association?.slug ||
      (metadata?.association_slug as string) ||
      '',
    status: event.status,
    start_at: event.start_at ?? null,
    end_at: event.end_at ?? null,
  };
}

const ASSOCIATION_EVENT_SELECT = `
  *,
  association:associations(id, name, slug, logo_url, is_verified, status)
`;

async function fetchFollowersCount(associationId: number): Promise<number> {
  const { count } = await supabase
    .from('association_follows')
    .select('*', { count: 'exact', head: true })
    .eq('association_id', associationId);

  return count ?? 0;
}

export async function getQuartierAssociations(
  quartierId: number,
  filters: QuartierAssociationsFilters = {},
): Promise<Association[]> {
  try {
    let query = supabase
      .from('associations')
      .select('*')
      .eq('quartier_id', quartierId)
      .order('name', { ascending: true });

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    } else if (!filters.includeManaged) {
      query = query.eq('status', 'active');
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const associations = await Promise.all(
      (data ?? []).map(async (row) => {
        const association = normalizeAssociation(row as Record<string, unknown>);
        if (!association) return null;
        association.followers_count = await fetchFollowersCount(association.id);
        return association;
      }),
    );

    return associations.filter((association): association is Association => association !== null);
  } catch (error) {
    console.error('Error fetching quartier associations:', error);
    return [];
  }
}

export async function getQuartierAssociationsPreview(quartierId: number): Promise<Association[]> {
  return getQuartierAssociations(quartierId, { includeManaged: false });
}

export async function getAssociationByIdentifier(
  identifier: string | number,
): Promise<Association | null> {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;

  try {
    let query = supabase.from('associations').select('*');

    if (isNumericIdentifier(normalized)) {
      query = query.eq('id', Number(normalized));
    } else {
      query = query.eq('slug', normalized.toLowerCase());
    }

    const { data, error } = await query.single();
    if (error) throw error;

    const association = normalizeAssociation(data as Record<string, unknown>);
    if (!association) return null;
    association.followers_count = await fetchFollowersCount(association.id);
    return association;
  } catch (error) {
    console.error('Error fetching association:', error);
    return null;
  }
}

export async function getAssociationPosts(
  associationId: number,
  options: { includeDrafts?: boolean } = {},
): Promise<AssociationPost[]> {
  try {
    let query = supabase
      .from('association_posts')
      .select('*')
      .eq('association_id', associationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (!options.includeDrafts) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? [])
      .map((row) => normalizeAssociationPost(row as Record<string, unknown>))
      .filter((post): post is AssociationPost => post !== null);
  } catch (error) {
    console.error('Error fetching association posts:', error);
    return [];
  }
}

export async function getAssociationEvents(
  associationId: number,
  options: { includeDrafts?: boolean; upcomingOnly?: boolean } = {},
): Promise<AssociationEvent[]> {
  try {
    let query = supabase
      .from('association_events')
      .select(ASSOCIATION_EVENT_SELECT)
      .eq('association_id', associationId)
      .is('deleted_at', null)
      .order('start_at', { ascending: true });

    if (!options.includeDrafts) {
      query = query.eq('status', 'published');
    }

    if (options.upcomingOnly) {
      query = query.gte('start_at', new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? [])
      .map((row) => normalizeAssociationEvent(row as Record<string, unknown>))
      .filter((event): event is AssociationEvent => event !== null);
  } catch (error) {
    console.error('Error fetching association events:', error);
    return [];
  }
}

export async function getQuartierAssociationEvents(
  quartierId: number,
  options: { upcomingOnly?: boolean } = {},
): Promise<AssociationAgendaEvent[]> {
  try {
    let query = supabase
      .from('association_events')
      .select(ASSOCIATION_EVENT_SELECT)
      .eq('quartier_id', quartierId)
      .is('deleted_at', null)
      .order('start_at', { ascending: true })
      .eq('status', 'published');

    if (options.upcomingOnly !== false) {
      query = query.gte('start_at', new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? [])
      .map((row) => normalizeAssociationEventForAgenda(row as Record<string, unknown>))
      .filter((event): event is AssociationAgendaEvent => event !== null);
  } catch (error) {
    console.error('Error fetching quartier association events:', error);
    return [];
  }
}

export async function getAssociationEventById(eventId: number): Promise<AssociationEvent | null> {
  try {
    const { data, error } = await supabase
      .from('association_events')
      .select(ASSOCIATION_EVENT_SELECT)
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return normalizeAssociationEvent(data as Record<string, unknown>);
  } catch (error) {
    console.error('Error loading association event:', error);
    return null;
  }
}

export async function getAssociationMembership(
  associationId: number,
  userId: string,
): Promise<AssociationMembership | null> {
  if (!associationId || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('association_members')
      .select('*')
      .eq('association_id', associationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data as AssociationMembership) || null;
  } catch (error) {
    console.error('Error fetching association membership:', error);
    return null;
  }
}

export async function isFollowingAssociation(
  associationId: number,
  userId: string,
): Promise<boolean> {
  if (!associationId || !userId) return false;

  try {
    const { data, error } = await supabase
      .from('association_follows')
      .select('id')
      .eq('association_id', associationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking association follow:', error);
    return false;
  }
}

export async function followAssociation(
  associationId: number,
  userId: string,
): Promise<{ success: boolean; error?: unknown }> {
  if (!associationId || !userId) {
    return { success: false, error: new Error('Missing follow context') };
  }

  try {
    const { error } = await supabase.from('association_follows').upsert(
      { association_id: associationId, user_id: userId },
      { onConflict: 'association_id,user_id', ignoreDuplicates: true },
    );

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error following association:', error);
    return { success: false, error };
  }
}

export async function unfollowAssociation(
  associationId: number,
  userId: string,
): Promise<{ success: boolean; error?: unknown }> {
  if (!associationId || !userId) {
    return { success: false, error: new Error('Missing follow context') };
  }

  try {
    const { error } = await supabase
      .from('association_follows')
      .delete()
      .eq('association_id', associationId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error unfollowing association:', error);
    return { success: false, error };
  }
}

export interface CreateAssociationPayload {
  quartier_id: number;
  name: string;
  slug: string;
  category?: string;
  short_description: string;
  full_description?: string | null;
  mission?: string | null;
  activities?: string[];
  audiences?: string[];
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  social_links?: Record<string, unknown>;
  address_text?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
}

export interface UpdateAssociationPayload {
  name?: string;
  slug?: string;
  category?: string;
  short_description?: string;
  full_description?: string | null;
  mission?: string | null;
  activities?: string[];
  audiences?: string[];
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  social_links?: Record<string, unknown>;
  address_text?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  status?: string;
  is_verified?: boolean;
  published_at?: string | null;
  [key: string]: unknown;
}

export async function getAssociationDashboardData(
  associationId: number | string,
  userId: string,
): Promise<{
  association: Association | null;
  posts: AssociationPost[];
  events: AssociationEvent[];
  membership: AssociationMembership | null;
}> {
  const [association, posts, events, membership] = await Promise.all([
    getAssociationByIdentifier(associationId),
    getAssociationPosts(Number(associationId), { includeDrafts: true }),
    getAssociationEvents(Number(associationId), { includeDrafts: true }),
    getAssociationMembership(Number(associationId), userId),
  ]);

  return {
    association,
    posts,
    events,
    membership,
  };
}

export async function createAssociation(
  payload: CreateAssociationPayload,
  _retryCount = 0,
): Promise<{ success: true; associationId: number } | { success: false; error: unknown }> {
  try {
    const slug =
      _retryCount === 0 ? payload.slug : `${payload.slug}-${Date.now().toString(36)}`;

    const { data, error } = await supabase.rpc('create_association_transaction', {
      p_quartier_id: payload.quartier_id,
      p_name: payload.name,
      p_slug: slug,
      p_category: payload.category || 'other',
      p_short_description: payload.short_description,
      p_full_description: payload.full_description || null,
      p_mission: payload.mission || null,
      p_activities: payload.activities || [],
      p_audiences: payload.audiences || [],
      p_contact_email: payload.contact_email || null,
      p_contact_phone: payload.contact_phone || null,
      p_website_url: payload.website_url || null,
      p_social_links: payload.social_links || {},
      p_address_text: payload.address_text || null,
      p_logo_url: payload.logo_url || null,
      p_cover_url: payload.cover_url || null,
    });

    if (error) {
      const isDuplicateSlug = error.message?.includes('idx_associations_slug_unique');
      if (isDuplicateSlug && _retryCount < 2) {
        return createAssociation(payload, _retryCount + 1);
      }
      throw error;
    }

    return { success: true, associationId: data as number };
  } catch (error) {
    console.error('Error creating association:', error);
    return { success: false, error };
  }
}

export async function refreshAssociationFeedMirrors(
  associationId: number,
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const [{ data: postRows, error: postError }, { data: eventRows, error: eventError }] =
      await Promise.all([
        supabase.from('association_posts').select('id').eq('association_id', associationId),
        supabase.from('association_events').select('id').eq('association_id', associationId),
      ]);

    if (postError) throw postError;
    if (eventError) throw eventError;

    await Promise.all([
      ...(postRows || []).map((row: { id: number }) =>
        supabase.rpc('sync_association_post_feed', { p_association_post_id: row.id }),
      ),
      ...(eventRows || []).map((row: { id: number }) =>
        supabase.rpc('sync_association_event_feed', { p_association_event_id: row.id }),
      ),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error refreshing association feed mirrors:', error);
    return { success: false, error };
  }
}

export async function updateAssociation(
  associationId: number,
  payload: UpdateAssociationPayload,
): Promise<{ success: true; data: Association } | { success: false; error: unknown }> {
  try {
    const updatePayload: UpdateAssociationPayload = {
      ...payload,
      updated_at: new Date().toISOString(),
    };

    if (updatePayload.status === 'active' && !updatePayload.published_at) {
      updatePayload.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('associations')
      .update(updatePayload)
      .eq('id', associationId)
      .select('*')
      .single();

    if (error) throw error;
    await refreshAssociationFeedMirrors(associationId);
    return { success: true, data: normalizeAssociation(data as Record<string, unknown>)! };
  } catch (error) {
    console.error('Error updating association:', error);
    return { success: false, error };
  }
}

export interface AdminReviewFilters {
  status?: string;
}

/** Admin review list — Vue parity: all associations ordered by created_at desc, optional status filter. */
export async function getAssociationsForAdminReview(
  filters: AdminReviewFilters = {},
): Promise<Association[]> {
  try {
    let query = supabase
      .from('associations')
      .select(
        `
        *,
        quartier:quartiers(id, name)
      `,
      )
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const associations = await Promise.all(
      (data ?? []).map(async (row) => {
        const association = normalizeAssociation(row as Record<string, unknown>);
        if (!association) return null;
        association.followers_count = await fetchFollowersCount(association.id);
        return association;
      }),
    );

    return associations.filter((association): association is Association => association !== null);
  } catch (error) {
    console.error('Error fetching associations for admin review:', error);
    return [];
  }
}

export interface LogModerationActionPayload {
  entityType: string;
  entityId: number | string;
  action: string;
  reason?: string | null;
  performedBy?: string | null;
}

/** Frontend-written moderation journal — Vue parity (no backend trigger). */
export async function logModerationAction({
  entityType,
  entityId,
  action,
  reason,
  performedBy,
}: LogModerationActionPayload): Promise<{ success: true } | { success: false; error: unknown }> {
  try {
    const { error } = await supabase.from('moderation_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      reason: reason || null,
      performed_by: performedBy || null,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error logging moderation action:', error);
    return { success: false, error };
  }
}

export interface CreateAssociationPostPayload {
  association_id: number;
  quartier_id: number;
  title?: string | null;
  content: string;
  image_url?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
}

export interface UpdateAssociationPostPayload {
  title?: string | null;
  content?: string;
  image_url?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
  published_at?: string | null;
  deleted_at?: string | null;
  updated_by?: string;
}

export async function createAssociationPost(
  payload: CreateAssociationPostPayload,
  userId: string,
): Promise<{ success: true; data: AssociationPost } | { success: false; error: unknown }> {
  try {
    const status = payload.status || 'draft';
    const { data, error } = await supabase
      .from('association_posts')
      .insert({
        association_id: payload.association_id,
        quartier_id: payload.quartier_id,
        title: payload.title || null,
        content: payload.content,
        image_url: payload.image_url || null,
        metadata: payload.metadata || {},
        status,
        created_by: userId,
        updated_by: userId,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return { success: true, data: normalizeAssociationPost(data as Record<string, unknown>)! };
  } catch (error) {
    console.error('Error creating association post:', error);
    return { success: false, error };
  }
}

export async function updateAssociationPost(
  postId: number,
  payload: UpdateAssociationPostPayload,
  userId: string,
): Promise<{ success: true; data: AssociationPost } | { success: false; error: unknown }> {
  try {
    const updatePayload: UpdateAssociationPostPayload = {
      ...payload,
      updated_by: userId,
    };

    if (updatePayload.status === 'published' && !updatePayload.published_at) {
      updatePayload.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('association_posts')
      .update(updatePayload)
      .eq('id', postId)
      .select('*')
      .single();

    if (error) throw error;
    return { success: true, data: normalizeAssociationPost(data as Record<string, unknown>)! };
  } catch (error) {
    console.error('Error updating association post:', error);
    return { success: false, error };
  }
}

export async function removeAssociationPost(
  postId: number,
  userId: string,
): Promise<{ success: true; data: AssociationPost } | { success: false; error: unknown }> {
  return updateAssociationPost(
    postId,
    {
      status: 'removed',
      deleted_at: new Date().toISOString(),
    },
    userId,
  );
}

export interface CreateAssociationEventPayload {
  association_id: number;
  quartier_id: number;
  title: string;
  description: string;
  category?: string | null;
  image_url?: string | null;
  start_at: string;
  end_at?: string | null;
  timezone?: string;
  location_text?: string | null;
  external_url?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
}

export interface UpdateAssociationEventPayload {
  title?: string;
  description?: string;
  category?: string | null;
  image_url?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  timezone?: string;
  location_text?: string | null;
  external_url?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
  published_at?: string | null;
  deleted_at?: string | null;
  updated_by?: string;
}

/**
 * Create association event via REST only.
 * Sync to feed_posts is trigger-owned (`trg_association_events_feed_sync`).
 * Do NOT call `sync_association_event_feed` after create (Vue parity / anti-double-sync).
 * Deployed backend may return 54001 (BLK-001) — frontend still mirrors Vue.
 */
export async function createAssociationEvent(
  payload: CreateAssociationEventPayload,
  userId: string,
): Promise<{ success: true; data: AssociationEvent } | { success: false; error: unknown }> {
  try {
    const status = payload.status || 'draft';
    const { data, error } = await supabase
      .from('association_events')
      .insert({
        association_id: payload.association_id,
        quartier_id: payload.quartier_id,
        title: payload.title,
        description: payload.description,
        category: payload.category || null,
        image_url: payload.image_url || null,
        start_at: payload.start_at,
        end_at: payload.end_at || null,
        timezone: payload.timezone || 'Indian/Reunion',
        location_text: payload.location_text || null,
        external_url: payload.external_url || null,
        metadata: payload.metadata || {},
        status,
        created_by: userId,
        updated_by: userId,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select(ASSOCIATION_EVENT_SELECT)
      .single();

    if (error) throw error;
    return { success: true, data: normalizeAssociationEvent(data as Record<string, unknown>)! };
  } catch (error) {
    console.error('Error creating association event:', error);
    return { success: false, error };
  }
}

/**
 * Update association event via REST only — no frontend sync RPC (Vue parity).
 */
export async function updateAssociationEvent(
  eventId: number,
  payload: UpdateAssociationEventPayload,
  userId: string,
): Promise<{ success: true; data: AssociationEvent } | { success: false; error: unknown }> {
  try {
    const updatePayload: UpdateAssociationEventPayload = {
      ...payload,
      updated_by: userId,
    };

    if (updatePayload.status === 'published' && !updatePayload.published_at) {
      updatePayload.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('association_events')
      .update(updatePayload)
      .eq('id', eventId)
      .select(ASSOCIATION_EVENT_SELECT)
      .single();

    if (error) throw error;
    return { success: true, data: normalizeAssociationEvent(data as Record<string, unknown>)! };
  } catch (error) {
    console.error('Error updating association event:', error);
    return { success: false, error };
  }
}

/** Soft-remove: status `removed` + deleted_at (Vue `removeAssociationEvent`). */
export async function removeAssociationEvent(
  eventId: number,
  userId: string,
): Promise<{ success: true; data: AssociationEvent } | { success: false; error: unknown }> {
  return updateAssociationEvent(
    eventId,
    {
      status: 'removed',
      deleted_at: new Date().toISOString(),
    },
    userId,
  );
}
