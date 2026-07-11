import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "Les variables d'environnement Supabase (URL et Anon Key) sont manquantes. L'application fonctionnera en mode limité.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseFunctionsUrl = `${supabaseUrl}/functions/v1`;
export { supabaseAnonKey };
