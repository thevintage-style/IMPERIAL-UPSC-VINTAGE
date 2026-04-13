import React, { useState, useEffect } from 'react';
import { auth, onSnapshot, doc, db, googleProvider, signInWithPopup, signOut as firebaseSignOut, getDoc, setDoc, OperationType, handleFirestoreError } from './lib/firebase';
import { supabase, signInWithEmail, signUpWithEmail, isConfigured as isSupabaseConfigured } from './lib/supabase';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Oracle } from './components/Oracle';
import { Cartographer } from './components/Cartographer';
import { Folio } from './components/Folio';
import { NewsDesk } from './components/NewsDesk';
import { Subscription } from './components/Subscription';
import { OwnerSettings } from './components/OwnerSettings';
import { Archives } from './components/Archives';
import { Syllabus } from './components/Syllabus';
import { Support } from './components/Support';
import { Profile } from './components/Profile';
import { VizierStudio } from './components/VizierStudio';
import { Community } from './components/Community';
import { PeerChat } from './components/PeerChat';
import { ResourceFeed } from './components/ResourceFeed';
import { SocialSidebar } from './components/SocialSidebar';
import { RulesAndRegulations } from './components/RulesAndRegulations';
import { VedicDashboard } from './components/VedicDashboard';
import { PersonalVault } from './components/PersonalVault';
import { Library } from './components/Library';
import { Button } from './components/ui/button';
import { LogIn, BookOpen } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempUser, setTempUser] = useState<FirebaseUser | SupabaseUser | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const isAdmin = (user as any)?.email === "raksha05jk.rao@gmail.com";

  useEffect(() => {
    let supabaseSub: any = null;
    let firebaseUnsubscribe: (() => void) | null = null;

    const setupFirebaseListener = () => {
      if (firebaseUnsubscribe) return;
      firebaseUnsubscribe = auth.onAuthStateChanged(async (u) => {
        if (u) {
          const uid = u.uid;
          try {
            // Sync Firebase user to Firestore client-side
            const { doc, setDoc } = await import('firebase/firestore');
            const userRef = doc(db, 'users', uid);
            const publicRef = doc(db, 'publicProfiles', uid);
            const userData = {
              uid,
              displayName: u.displayName,
              email: u.email,
              role: u.email === "raksha05jk.rao@gmail.com" ? 'admin' : 'user',
              subscriptionStatus: 'free',
              lastLoginAt: new Date().toISOString()
            };
            await setDoc(userRef, userData, { merge: true });
            await setDoc(publicRef, {
              uid,
              displayName: u.displayName,
              photoURL: u.photoURL,
              role: userData.role,
              lastLoginAt: userData.lastLoginAt
            }, { merge: true });
            console.log("Firebase Profile Sync: Success");
          } catch (error) {
            console.error("Firebase Sync Error:", error);
          }
        }
        if (!otpStep) {
          setUser(u);
        }
        setLoading(false);
      });
    };

    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const sUser = session.user;
          setUser(sUser);
          setLoading(false);
          
          // Hybrid Auth: Get Firebase custom token for the Supabase user
          try {
            const tokenRes = await fetch('/api/auth/firebase-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: sUser.id,
                email: sUser.email,
                displayName: sUser.user_metadata?.full_name || sUser.email?.split('@')[0]
              })
            });
            
            if (tokenRes.ok) {
              const { token } = await tokenRes.json();
              const { signInWithCustomToken } = await import('firebase/auth');
              const { doc, setDoc } = await import('firebase/firestore');
              await signInWithCustomToken(auth, token);
              console.log("Hybrid Auth: Firebase session established for Supabase user");

              // Sync user to Firestore client-side now that we have a Firebase session
              try {
                const userRef = doc(db, 'users', sUser.id);
                const publicRef = doc(db, 'publicProfiles', sUser.id);
                const userData = {
                  uid: sUser.id,
                  displayName: sUser.user_metadata?.full_name || sUser.email?.split('@')[0],
                  email: sUser.email,
                  role: sUser.email === "raksha05jk.rao@gmail.com" ? 'admin' : 'user',
                  subscriptionStatus: 'free',
                  lastLoginAt: new Date().toISOString()
                };
                await setDoc(userRef, userData, { merge: true });
                await setDoc(publicRef, {
                  uid: sUser.id,
                  displayName: userData.displayName,
                  role: userData.role,
                  lastLoginAt: userData.lastLoginAt
                }, { merge: true });
                console.log("Client-side Profile Sync: Success");
              } catch (syncError) {
                console.error("Client-side Profile Sync Error:", syncError);
              }
            }
          } catch (error) {
            console.error("Hybrid Auth Error:", error);
          }
        } else {
          setupFirebaseListener();
        }
      });
      supabaseSub = data.subscription;
    } else {
      setupFirebaseListener();
    }

    return () => {
      if (supabaseSub) supabaseSub.unsubscribe();
      if (firebaseUnsubscribe) firebaseUnsubscribe();
    };
  }, [otpStep]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginLoading) return;
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }
    setLoginLoading(true);
    console.log(`Initiating Imperial ${isSignUp ? 'Registration' : 'Reconnaissance'} via Supabase...`);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        alert("Check your email for the confirmation link!");
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      console.error("Supabase Auth Failed:", error);
    } finally {
      setLoginLoading(false);
    }
  };

  const verifyOtp = () => {
    if (otp === '123456') { // Simulated OTP for demo
      setUser(tempUser);
      setOtpStep(false);
    } else {
      alert("Invalid verification code. The Imperial guard denies entry.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-[#5A5A40] animate-pulse mx-auto mb-4" />
          <p className="font-serif italic text-[#5A5A40]">Opening the Imperial Archives...</p>
        </div>
      </div>
    );
  }

  if (!user && !otpStep) {
    return (
      <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-[#5A5A40]/10 text-center">
          <div className="w-20 h-20 bg-[#5A5A40] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2">Imperial Scholar</h1>
          <p className="text-[#5A5A40] font-serif italic mb-8">Your world-class companion for the UPSC journey.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left">
              <label className="block text-xs font-serif font-bold text-[#5A5A40] uppercase tracking-widest mb-1 ml-1">Email Address</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scholar@imperial.in"
                className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#5A5A40] transition-all"
                required
              />
            </div>
            <div className="text-left">
              <label className="block text-xs font-serif font-bold text-[#5A5A40] uppercase tracking-widest mb-1 ml-1">Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#5A5A40] transition-all"
                required
              />
            </div>
            <Button 
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#5A5A40] hover:bg-[#4A4A30] text-white rounded-full py-6 text-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 mt-4"
            >
              <LogIn className="w-5 h-5 mr-2" />
              {loginLoading ? "Authenticating..." : (isSignUp ? "Sign Up" : "Begin")}
            </Button>
          </form>

          <div className="mt-6">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-serif text-[#5A5A40] hover:text-[#8B4513] underline transition-colors"
            >
              {isSignUp ? "Already have an account? Sign In" : "New here? Create an account"}
            </button>
          </div>

          <p className="mt-8 text-xs text-[#5A5A40]/60 uppercase tracking-widest">Est. 2026 • Indian / India</p>
        </div>
      </div>
    );
  }

  if (otpStep) {
    return (
      <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[40px] shadow-2xl border border-[#5A5A40]/10 text-center">
          <h1 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-2">Verification Required</h1>
          <p className="text-[#5A5A40] font-serif italic mb-8">A code has been sent to your device.</p>
          <input 
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-2xl py-4 px-6 text-center text-2xl font-mono tracking-widest mb-8 outline-none focus:ring-2 focus:ring-[#5A5A40]"
          />
          <Button 
            onClick={verifyOtp}
            className="w-full bg-[#5A5A40] hover:bg-[#4A4A30] text-white py-8 rounded-2xl text-lg font-bold transition-all shadow-xl"
          >
            Verify Identity
          </Button>
          <p className="mt-4 text-xs text-[#5A5A40]/60 font-serif">Demo Code: 123456</p>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user as any} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <VedicDashboard user={user as any} setActiveTab={setActiveTab} />}
      {activeTab === 'syllabus' && <Syllabus />}
      {activeTab === 'oracle' && <Oracle user={user as any} />}
      {activeTab === 'cartographer' && <Cartographer user={user as any} />}
      {activeTab === 'folio' && <Folio user={user as any} />}
      {activeTab === 'news' && <NewsDesk user={user as any} />}
      {activeTab === 'archives' && <Library user={user as any} isAdmin={isAdmin} />}
      {activeTab === 'vault' && <PersonalVault user={user as any} />}
      {activeTab === 'subscription' && <Subscription user={user as any} />}
      {activeTab === 'support' && <Support user={user as any} />}
      {activeTab === 'profile' && <Profile user={user as any} />}
      {activeTab === 'vizier-studio' && <VizierStudio user={user as any} />}
      {activeTab === 'community' && <Community user={user as any} isAdmin={isAdmin} />}
      {activeTab === 'peer-chat' && <PeerChat user={user as any} />}
      {activeTab === 'resources' && <ResourceFeed user={user as any} isAdmin={isAdmin} />}
      {activeTab === 'rules' && isAdmin && <RulesAndRegulations user={user as any} />}
      {activeTab === 'owner-settings' && isAdmin && <OwnerSettings user={user as any} />}
      
      <SocialSidebar />
    </Layout>
  );
}
