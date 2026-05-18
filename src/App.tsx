import React, { useState, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase, signInWithEmail, signUpWithEmail, isConfigured as isSupabaseConfigured, configurationError, signOut } from './lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Oracle } from './components/Oracle';
import { Cartographer } from './components/Cartographer';
import { Folio } from './components/Folio';
import { NewsDesk } from './components/NewsDesk';
import { IntegratedResourceHub } from './components/IntegratedResourceHub';
import { Subscription } from './components/Subscription';
import { OwnerSettings } from './components/OwnerSettings';
import { Syllabus } from './components/Syllabus';
import { Support } from './components/Support';
import { Profile } from './components/Profile';
import { VizierStudio } from './components/VizierStudio';
import { Community } from './components/Community';
import { PeerChat } from './components/PeerChat';
import { RulesAndRegulations } from './components/RulesAndRegulations';
import { VedicDashboard } from './components/VedicDashboard';
import { PersonalVault } from './components/PersonalVault';
import { VizierControl } from './components/VizierControl';
import { Success } from './components/Success';
import { Button } from './components/ui/button';
import { LogIn, BookOpen } from 'lucide-react';

import { UserProfile } from './types';

export default function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSignUp, setIsSignUp] = useState(true);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const isAdmin = user?.email === "raksha05jk.rao@gmail.com";

  useEffect(() => {
    // Safety timeout: Ensure loading screen clears even if auth listeners hang
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          
          // Sync and Fetch user profile
          try {
            const sUser = session.user;
            
            // 1. Fetch current profile
            const { data: existingProfile, error: fetchError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', sUser.id)
              .single();

            let currentProfile = existingProfile;

            // 2. Upsert/Create if missing or needs update
            if (!existingProfile || fetchError) {
              const { data: newProfile, error: upsertError } = await supabase
                .from('user_profiles')
                .upsert({
                  id: sUser.id,
                  email: sUser.email,
                  full_name: sUser.user_metadata?.full_name || sUser.email?.split('@')[0],
                  plan_type: 'Free',
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' })
                .select()
                .single();
              
              if (!upsertError) currentProfile = newProfile;
            }

            // 3. Subscription Check logic
            if (currentProfile) {
              const expiresAt = currentProfile.subscription_expires_at;
              // Check if the plan is still valid as requested by user
              const isImperialValid = currentProfile.plan_type === 'Imperial' && 
                                     expiresAt && new Date(expiresAt) > new Date();
                                     
              if (expiresAt && new Date(expiresAt) < new Date() && currentProfile.plan_type !== 'Free') {
                // Subscription has expired
                const { data: updatedProfile } = await supabase
                  .from('user_profiles')
                  .update({ plan_type: 'Expired' })
                  .eq('id', sUser.id)
                  .select()
                  .single();
                
                if (updatedProfile) currentProfile = updatedProfile;
              }
              setProfile(currentProfile);
            }
          } catch (err) {
            console.error("Profile Management Error:", err);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });

      // Check initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setUser(session.user);
        }
        setLoading(false);
      });

      return () => {
        clearTimeout(timeout);
        data.subscription.unsubscribe();
      };
    } else {
      setLoading(false);
      return () => clearTimeout(timeout);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center relative">
        {configurationError && (
          <div className="fixed top-0 left-0 right-0 z-[10000] bg-red-600 text-white px-6 py-4 shadow-2xl flex items-center justify-center gap-3">
             <span className="font-bold whitespace-nowrap">⚠️ Archive Error:</span>
             <p className="text-sm font-medium">{configurationError}</p>
             <button onClick={() => window.location.reload()} className="bg-white/20 hover:bg-white/40 px-3 py-1 rounded-lg text-xs font-bold transition-colors">Test Connection</button>
          </div>
        )}
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-[#5A5A40] animate-pulse mx-auto mb-4" />
          <p className="font-serif italic text-[#5A5A40]">Opening the Imperial Archives...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center p-4 relative">
        {configurationError && (
          <div className="fixed top-0 left-0 right-0 z-[10000] bg-red-600 text-white px-6 py-4 shadow-2xl flex items-center justify-center gap-3">
             <span className="font-bold whitespace-nowrap">⚠️ Archive Error:</span>
             <p className="text-sm font-medium">{configurationError}</p>
             <button onClick={() => window.location.reload()} className="bg-white/20 hover:bg-white/40 px-3 py-1 rounded-lg text-xs font-bold transition-colors">Test Connection</button>
          </div>
        )}
        <div className="max-w-md w-full bg-white p-8 rounded-[40px] shadow-2xl border-4 border-[#5A5A40] text-center relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />
          
          <div className="w-20 h-20 bg-[#5A5A40] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2 tracking-tight italic">Imperial Scholar</h1>
          <p className="text-[#5A5A40] font-serif italic mb-8">Your world-class companion for the UPSC journey.</p>
          
          <div className="auth-container text-left space-y-6">
            <h2 className="text-lg font-serif font-bold text-[#5A5A40] uppercase tracking-widest text-center mb-6">
              {isSignUp ? "Register in Archives" : "Enter the Archives"}
            </h2>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const email = formData.get('email') as string;
              const password = formData.get('password') as string;
              
              setLoading(true);
              try {
                if (isSignUp) {
                  const { error } = await signUpWithEmail(email, password);
                  if (error) throw error;
                  window.alert("Imperial confirmation raven dispatched! Please check your email.");
                } else {
                  const { error } = await signInWithEmail(email, password);
                  if (error) throw error;
                }
              } catch (error: any) {
                console.error("Auth Error:", error);
                window.alert("Authentication Failed: " + (error.message || error));
              } finally {
                setLoading(false);
              }
            }} className="space-y-4">
              <div className="space-y-2">
                <label className="font-bold uppercase tracking-widest text-[#5A5A40] text-[10px] ml-1">Sacred Email</label>
                <input 
                  required
                  type="email" 
                  name="email"
                  placeholder="scholar@imperial.edu"
                  className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 focus:ring-2 focus:ring-[#5A5A40] rounded-xl py-3 px-4 outline-none font-serif"
                />
              </div>
              <div className="space-y-2">
                <label className="font-bold uppercase tracking-widest text-[#5A5A40] text-[10px] ml-1">Imperial Cipher</label>
                <input 
                  required
                  type="password" 
                  name="password"
                  placeholder="••••••••"
                  className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 focus:ring-2 focus:ring-[#5A5A40] rounded-xl py-3 px-4 outline-none font-serif"
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#5A5A40] hover:bg-[#8B4513] text-parchment font-bold tracking-widest uppercase py-6 rounded-xl shadow-md transition-all mt-4"
              >
                {loading ? "Verifying Lineage..." : (isSignUp ? "Register" : "Sign In")}
              </Button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-[#5A5A40]/10">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-serif text-[#5A5A40] hover:text-[#8B4513] underline transition-colors"
            >
              {isSignUp ? "Already have an account? Sign In" : "New here? Create an account"}
            </button>
          </div>

          <p className="mt-8 text-[10px] text-[#5A5A40]/40 uppercase tracking-widest font-serif italic">Est. 2026 • Indian / India</p>
        </div>
      </div>
    );
  }

  // Handle success route
  if (window.location.pathname === '/success') {
    return <Success />;
  }

  return (
    <Layout 
      user={user as any} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      profile={profile}
      onEntrySelect={(id) => setSelectedEntryId(id)}
    >
      {activeTab === 'dashboard' && <VedicDashboard user={user as any} profile={profile} setActiveTab={setActiveTab} />}
      {activeTab === 'syllabus' && <Syllabus user={user as any} />}
      {activeTab === 'oracle' && <Oracle user={user as any} profile={profile} />}
      {activeTab === 'cartographer' && <Cartographer user={user as any} />}
      {activeTab === 'folio' && <Folio user={user as any} selectedEntryId={selectedEntryId} />}
      {activeTab === 'news' && <NewsDesk user={user as any} />}
      {activeTab === 'resource-hub' && <IntegratedResourceHub user={user as any} isAdmin={isAdmin} />}
      {activeTab === 'vault' && <PersonalVault user={user as any} />}
      {activeTab === 'subscription' && <Subscription user={user as any} profile={profile} />}
      {activeTab === 'support' && <Support user={user as any} />}
      {activeTab === 'profile' && <Profile user={user as any} profile={profile} />}
      {activeTab === 'vizier-studio' && <VizierStudio user={user as any} />}
      {activeTab === 'vizier-control' && isAdmin && <VizierControl user={user as any} />}
      {activeTab === 'community' && <Community user={user as any} isAdmin={isAdmin} />}
      {activeTab === 'peer-chat' && <PeerChat user={user as any} />}
      {activeTab === 'rules' && isAdmin && <RulesAndRegulations user={user as any} />}
      {activeTab === 'owner-settings' && isAdmin && <OwnerSettings user={user as any} />}
    </Layout>
  );
}
