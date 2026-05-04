import { createClient } from '@supabase/supabase-js';

export let configurationError: string | null = null;

const getAllCredentials = () => {
  const env = { 
    ...(process.env || {}), 
    ...((import.meta as any).env || {}) 
  } as Record<string, string | undefined>;

  const keys = Object.keys(env);
  const supabaseKeys = keys.filter(k => k.includes('SUPABASE'));
  
  let detectedUrl: string | null = null;
  let detectedAnonKey: string | null = null;
  let firebaseKeyFoundInSupabaseField = false;

  // First pass: Find anything that looks like a Supabase URL or Key
  for (const k of supabaseKeys) {
    const val = env[k];
    if (!val || typeof val !== 'string') continue;

    if (val.startsWith('http')) {
      detectedUrl = val;
    } else if (val.startsWith('AIzaSy')) {
      firebaseKeyFoundInSupabaseField = true;
    } else if (val.length > 20) {
      // Likely the anonymous key (Supabase keys are usually long JWTs)
      detectedAnonKey = val;
    }
  }

  if (firebaseKeyFoundInSupabaseField && !detectedUrl) {
    configurationError = "A Firebase API Key (AIzaSy...) was found in a Supabase field, and no valid Supabase URL was detected. Please check your Secrets.";
    detectedUrl = 'https://misconfigured.supabase.co';
  } else if (!detectedUrl) {
    configurationError = "Imperial Archives URL missing. Ensure NEXT_PUBLIC_SUPABASE_URL is set (should start with http).";
  } else if (!detectedAnonKey) {
    configurationError = "Imperial Archives Anonymous Key missing. Ensure NEXT_PUBLIC_SUPABASE_ANON_KEY is set.";
  }

  return {
    url: detectedUrl || 'https://placeholder.supabase.co',
    key: detectedAnonKey || 'placeholder'
  };
};

const credentials = getAllCredentials();
const supabaseUrl = credentials.url;
const supabaseAnonKey = credentials.key;

export const isConfigured = 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseUrl !== 'https://misconfigured.supabase.co' &&
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
  
  console.log(`[Auth] Attempting sign-in for: ${email.trim()}`);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    
    if (error) {
      console.error('[Supabase Auth Error]', {
        message: error.message,
        status: error.status,
        code: (error as any).code
      });
      
      if (error.message.includes("Invalid login credentials") || error.message.includes("invalid claim")) {
        throw new Error("The Imperial Guard does not recognize these credentials. Please ensure your email and password are correct, or Register for a new account.");
      }
      
      if (error.message.includes("Email not confirmed")) {
        throw new Error("Your Imperial scroll has not been verified. Please check your raven (email) for a confirmation link.");
      }

      throw error;
    }
    
    console.log("[Auth] Sign-in successful for user ID:", data.user?.id);
    return data;
  } catch (error: any) {
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  if (!isConfigured) {
    const msg = 'Imperial Archives inaccessible: Supabase credentials missing.';
    console.error(`[Auth] ${msg}`);
    throw new Error(msg);
  }

  console.log(`[Auth] Attempting registration for: ${email.trim()}`);
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
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
  try {
    console.log("[Auth] Initiating Imperial Departure...");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Explicitly clear local storage to ensure fresh state for testing
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to home/login
    window.location.href = '/';
  } catch (error) {
    console.error('[Auth] Logout sequence failed:', error);
    // Even if error, clear local and redirect
    localStorage.clear();
    window.location.href = '/';
  }
};
