import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://rqnviybagpwpqdtwlkae.supabase.co';
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'placeholder';

// Custom fetch with retry logic for maintenance periods
const fetchWithRetry = async (url: string, options: any, retries = 3): Promise<Response> => {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err: any) {
    const isRetryable = err.message.includes('Failed to fetch') || 
                       err.message.includes('NetworkError') || 
                       err.name === 'TypeError'; // Often thrown on fetch failures
    
    if (retries > 0 && isRetryable) {
      console.warn(`[Supabase] Fetch failed. Retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
};

export const isConfigured = !!((import.meta as any).env.VITE_SUPABASE_URL && (import.meta as any).env.VITE_SUPABASE_ANON_KEY);
export const configurationError = isConfigured ? null : "Imperial Archives credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: fetchWithRetry
  }
});

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
  try {
    // Attempt official sign out
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Imperial Archives: Official sign out failed, proceeding with Hard Reset.", err);
  } finally {
    // The Hard Reset: Clear all local states regardless of success
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies (best effort)
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Force redirect to landing page and refresh
    window.location.href = '/';
  }
};
