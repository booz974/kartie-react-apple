import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getProfile, updateQuartier } from '@/api/profiles';
import type { Profile } from '@/lib/types/contract';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  ready: boolean;
  signOut: () => Promise<void>;
  updateUserQuartier: (quartierId: number) => Promise<void>;
  setProfile: (profile: Profile | null) => void;
}

async function loadProfile(session: Session | null): Promise<Profile | null> {
  if (!session) return null;

  try {
    return await getProfile(session.user.id);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  ready: false,

  setProfile: (profile) => set({ profile }),

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  },

  updateUserQuartier: async (quartierId: number) => {
    const { session, profile } = get();
    if (!session) return;

    try {
      await updateQuartier(session.user.id, quartierId);
      if (profile) {
        set({ profile: { ...profile, quartier_id: quartierId } });
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du quartier:', err);
      throw err;
    }
  },
}));

async function initializeAuth(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const profile = await loadProfile(session);

    useAuthStore.setState({ session, profile });

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      const nextProfile = await loadProfile(nextSession);
      useAuthStore.setState({ session: nextSession, profile: nextProfile });
    });
  } finally {
    useAuthStore.setState({ ready: true });
  }
}

void initializeAuth();

export function waitForAuthReady(): Promise<void> {
  if (useAuthStore.getState().ready) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.ready) {
        unsubscribe();
        resolve();
      }
    });
  });
}
