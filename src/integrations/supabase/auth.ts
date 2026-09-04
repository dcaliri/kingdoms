import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export const signInWithGoogle = async (): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  if (error) throw error;
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentSession = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
};

// Returns the authenticated user's id, or null when playing anonymously.
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch (error) {
    console.error('Failed to get current user id:', error);
    return null;
  }
};