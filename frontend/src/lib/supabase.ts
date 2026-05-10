import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED === 'true';

function createNoopSupabaseClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => undefined } },
      }),
      signInWithPassword: async () => ({ data: null, error: new Error('Authentication is not configured') }),
      signUp: async () => ({ data: null, error: new Error('Authentication is not configured') }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: new Error('Authentication is not configured') }),
      updateUser: async () => ({ error: new Error('Authentication is not configured') }),
    },
  };
}

export const supabase =
  authEnabled && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createNoopSupabaseClient();

/**
 * Get the current session's access token for API calls.
 * Returns null if no session exists.
 */
export async function getAccessToken(): Promise<string | null> {
  if (!authEnabled || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
