import type { Session as SupabaseSession } from '@supabase/supabase-js';

export type Session = SupabaseSession;

export interface Profile {
  username: string | null;
  role: 'admin' | string;
  quartier_id: number | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === 'admin';
}

export function hasQuartier(profile: Profile | null | undefined): boolean {
  return profile?.quartier_id != null;
}

export function isProfileComplete(profile: Profile | null | undefined): boolean {
  return Boolean(profile?.first_name?.trim() && profile?.last_name?.trim());
}

export interface Quartier {
  id: number;
  name: string;
  image_url?: string | null;
  stats?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface Event {
  id: number;
  quartier_id: number;
  title: string;
  description?: string | null;
  date?: string | null;
  image?: string | null;
  image_url?: string | null;
  deleted_at?: string | null;
  [key: string]: unknown;
}

export interface MunicipalAgendaEvent extends Event {
  source: 'municipal';
  routePath: string;
  image: string | null;
}

export interface AssociationAgendaEvent {
  id: string;
  original_id: number;
  source: 'association';
  title: string;
  date: string;
  location: string;
  image: string | null;
  routePath: string;
  association_name: string;
  association_slug: string;
  start_at: string | null;
  end_at: string | null;
  status: string;
}

export type AgendaEvent = MunicipalAgendaEvent | AssociationAgendaEvent;

export interface News {
  id: number;
  quartier_id: number;
  title: string;
  content?: string | null;
  date?: string | null;
  deleted_at?: string | null;
  [key: string]: unknown;
}

export interface Realisation {
  id: number;
  quartier_id: number;
  title: string;
  content?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
  [key: string]: unknown;
}

export interface Petition {
  id: number;
  quartier_id: number;
  title: string;
  description?: string | null;
  goal?: number | null;
  current_supports?: number | null;
  theme?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
  [key: string]: unknown;
}

export interface ConsultationOption {
  id: number;
  consultation_id: number;
  label?: string | null;
  text?: string | null;
  consultation_votes?: Array<{ count: number }>;
}

export interface Consultation {
  id: number;
  quartier_id: number;
  title?: string | null;
  question?: string | null;
  multiple_choices: boolean;
  deleted_at?: string | null;
  consultation_options?: ConsultationOption[];
}

export interface ConsultationDetails {
  id: number;
  title?: string | null;
  question?: string | null;
  multiple_choices?: boolean;
  options?: ConsultationOption[];
  [key: string]: unknown;
}

export interface FeedComment {
  id: number;
  post_id: number;
  parent_id: number | null;
  content: string;
  image_url?: string | null;
  author: string;
  avatar?: string | null;
  user_id?: string;
  created_at?: string;
}

export interface Reaction {
  post_id: number;
  user_id: string;
  reaction_type: string;
}

export interface FeedPost {
  id: number;
  quartier_id: number;
  type: string;
  post_type?: string;
  content?: string | null;
  image_url?: string | null;
  status?: string | null;
  deleted_at?: string | null;
  author: string;
  avatar?: string | null;
  likes?: number;
  circle_id?: number | null;
  created_at?: string;
  comments: FeedComment[];
  reactions: Reaction[];
  metadata?: {
    location?: {
      lat: number;
      lng: number;
      address?: string;
    };
    reactions?: Record<string, number>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Circle {
  id: number;
  quartier_id: number;
  name: string;
  member_count: number;
  is_member: boolean;
  [key: string]: unknown;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export type AlaUneContentType = 'article' | 'event' | 'sondage' | 'flash_info';

/** Persisted shape of À la Une sondage options (Vue AlaUneForm). */
export interface AlaUneSondageOption {
  option_text: string;
  vote_count: number;
}

export interface AlaUneContent {
  id: number;
  type: AlaUneContentType;
  title?: string | null;
  content?: string | null;
  image_url?: string | null;
  event_date?: string | null;
  location?: string | null;
  is_active?: boolean | null;
  sondage_options?: AlaUneSondageOption[] | ConsultationOption[] | null;
  created_at?: string | null;
  votes?: unknown;
}

export interface AlaUneVM {
  article?: AlaUneContent & { description?: string | null };
  event?: AlaUneContent & { date?: string | null };
  sondage?: AlaUneContent & {
    question?: string | null;
    consultation_options?: AlaUneSondageOption[] | ConsultationOption[] | null;
  };
  flashInfos: AlaUneContent[];
}

export interface UserAlaUneVote {
  id: number;
  user_id: string;
  ala_une_content_id: number;
}

export type AssociationStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface Association {
  id: number;
  slug?: string | null;
  name: string;
  status: AssociationStatus | string;
  deleted_at?: string | null;
  activities: unknown[];
  audiences: unknown[];
  social_links: Record<string, unknown>;
  category_label?: string | null;
  status_label?: string | null;
  is_publicly_visible: boolean;
  followers_count: number;
  quartier?: Quartier | null;
  [key: string]: unknown;
}

export type AssociationPostStatus = 'draft' | 'published' | 'archived' | 'removed';

export interface AssociationPost {
  id: number;
  association_id: number;
  status: AssociationPostStatus | string;
  metadata: Record<string, unknown>;
  title: string;
  image_url?: string | null;
  [key: string]: unknown;
}

export type AssociationEventStatus =
  | 'draft'
  | 'published'
  | 'cancelled'
  | 'archived'
  | 'removed';

export interface AssociationEvent {
  id: number;
  association_id: number;
  title: string;
  status: AssociationEventStatus | string;
  image_url?: string | null;
  display_date?: string | null;
  location?: string | null;
  routePath?: string;
  source?: 'association';
  association?: Association | null;
  start_at?: string | null;
  end_at?: string | null;
  [key: string]: unknown;
}

export interface AssociationMembership {
  id: number;
  association_id: number;
  user_id: string;
  role?: string | null;
  [key: string]: unknown;
}

export interface ModerationLog {
  id: number;
  [key: string]: unknown;
}

export interface RagDocument {
  id: string;
  [key: string]: unknown;
}

/** Option agrégée renvoyée par RPC `get_all_sondages_by_quartier`. */
export interface SondageAdminOption {
  text: string;
  votes: number;
}

/** Sondage (consultation) dans la réponse admin transversale. */
export interface SondageAdminItem {
  id: number;
  title: string;
  description?: string | null;
  options: SondageAdminOption[];
}

/** Groupe par quartier — forme exacte de `get_all_sondages_by_quartier`. */
export interface SondageAdminQuartierGroup {
  quartier_nom: string;
  sondages: SondageAdminItem[];
}

/** @deprecated Prefer SondageAdminItem / SondageAdminQuartierGroup */
export interface SondageAdmin {
  id: number;
  quartier_id?: number;
  title?: string | null;
  [key: string]: unknown;
}

export interface QuartierListItem {
  id: number;
  name: string;
}
