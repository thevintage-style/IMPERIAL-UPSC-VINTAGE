import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || (import.meta as any).env.VITE_SUPABASE_URL;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    console.error("[Supabase] Invalid or missing NEXT_PUBLIC_SUPABASE_URL. Found:", url);
    return 'https://placeholder.supabase.co';
  }
  return url;
};

const getSupabaseKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
  if (!key || typeof key !== 'string') {
    console.error("[Supabase] Invalid or missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    return 'placeholder';
  }
  return key;
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseKey();

export const isConfigured = 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder';

if (!isConfigured) {
  console.warn('Supabase is not fully configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signInWithEmail = async (email: string, password: string) => {
  if (!isConfigured) {
    const msg = 'Imperial Archives inaccessible: Supabase credentials missing.';
    console.error(`[Auth] ${msg}`);
    throw new Error(msg);
  }
  
  console.log(`[Auth] Attempting sign-in for: ${email}`);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('[Supabase Auth Error]', {
        message: error.message,
        status: error.status,
        code: (error as any).code
      });
      
      if (error.message.includes("Invalid login credentials")) {
        // Double check if user exists (this is a security concern if exposed, 
        // but for debugging we log the full error)
        throw new Error("The Imperial Guard does not recognize these credentials. Please check your email/password or Register.");
      }
      
      if (error.message.includes("Email not confirmed")) {
        throw new Error("Your Imperial scroll has not been verified. Please check your raven (email) for a confirmation link.");
      }

      throw error;
    }
    
    console.log("[Auth] Sign-in successful for user ID:", data.user?.id);
    return data;
  } catch (error: any) {
    console.error('[Provider Error Detail]:', error.message || error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  if (!isConfigured) {
    const msg = 'Imperial Archives inaccessible: Supabase credentials missing.';
    console.error(`[Auth] ${msg}`);
    throw new Error(msg);
  }

  console.log(`[Auth] Attempting registration for: ${email}`);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      }
    });

    if (error) {
      console.error('[Supabase Registration Error]', error);
      throw error;
    }

    console.log("[Auth] Registration initiated:", data.user?.id);
    
    // Check if auto-confirmed (if disabled in dashboard)
    if (data.session) {
      console.log("[Auth] Account auto-confirmed and session established.");
      return data;
    }

    return data;
  } catch (error: any) {
    console.error('[Provider Error Detail]:', error.message || error);
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
