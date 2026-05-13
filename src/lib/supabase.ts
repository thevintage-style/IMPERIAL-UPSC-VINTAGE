import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const isConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
export const configurationError = isConfigured ? null : "Imperial Archives credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth Helpers
export const signInWithEmail = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signUpWithEmail = async (email: string, password: string) => {
  return await supabase.auth.signUp({ 
    email, 
    password,
    options: { emailRedirectTo: window.location.origin }
  });
};

export const signOut = async () => {
  await supabase.auth.signOut();
  window.location.href = '/';
};
