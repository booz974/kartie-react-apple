import { supabase } from '@/lib/supabase';

export async function getEdgeFunctionToken(options: { requireSession?: boolean } = {}) {
  const { requireSession = false } = options;
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (requireSession && !token) {
    throw new Error('Authentification requise pour cette opération');
  }

  return token || null;
}
