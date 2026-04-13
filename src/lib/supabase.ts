import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return 'https://placeholder.supabase.co';
  }
  return url;
};

const getSupabaseKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key || typeof key !== 'string') {
    return 'placeholder';
  }
  return key;
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseKey();

export const isConfigured = 
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && 
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http') &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!isConfigured) {
  console.warn('Supabase is not fully configured. Please set NEXT_PUBLIC_SUPABASE_URL (must start with http/https) and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signInWithEmail = async (email: string, password: string) => {
  if (!isConfigured) {
    const msg = 'Supabase is not configured. Please add your credentials to the environment variables.';
    console.error(msg);
    alert(msg);
    return;
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Supabase Sign In Error:', error);
    alert(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  if (!isConfigured) {
    const msg = 'Supabase is not configured. Please add your credentials to the environment variables.';
    console.error(msg);
    alert(msg);
    return;
  }
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Supabase Sign Up Error:', error);
    alert(`Sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  if (!isConfigured) {
    const msg = 'Supabase is not configured. Please add your credentials to the environment variables.';
    console.error(msg);
    alert(msg);
    return;
  }
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Supabase Login Error:', error);
    alert(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Supabase Logout Error:', error);
  }
};
