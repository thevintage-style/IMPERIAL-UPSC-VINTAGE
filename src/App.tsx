import React, { useState, useEffect } from 'react';
import { auth, onSnapshot, doc, db, googleProvider, signInWithPopup, signOut, getDoc, setDoc, OperationType, handleFirestoreError } from './lib/firebase';
import { User } from 'firebase/auth';
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const isAdmin = user?.email === "raksha05jk.rao@gmail.com";

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        // Ensure user profile exists
        const userRef = doc(db, `users/${u.uid}`);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: u.uid,
              displayName: u.displayName,
              email: u.email,
              role: u.email === "raksha05jk.rao@gmail.com" ? 'admin' : 'user',
              subscriptionStatus: 'free',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            });
          } else {
            await setDoc(userRef, {
              lastLoginAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
      }
      // If we are in OTP step, don't set user yet
      if (!otpStep) {
        setUser(u);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [otpStep]);

  const handleLogin = async () => {
    if (loginLoading) return;
    setLoginLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setTempUser(result.user);
      setOtpStep(true);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.warn("Login popup request was cancelled by a subsequent request.");
      } else {
        console.error("Login failed", error);
      }
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
          <Button 
            onClick={handleLogin}
            disabled={loginLoading}
            className="w-full bg-[#5A5A40] hover:bg-[#4A4A30] text-white rounded-full py-6 text-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <LogIn className="w-5 h-5 mr-2" />
            {loginLoading ? "Preparing the Scrolls..." : "Begin Your Reconnaissance"}
          </Button>
          <p className="mt-6 text-xs text-[#5A5A40]/60 uppercase tracking-widest">Est. 2026 • Indian / India</p>
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
    <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <VedicDashboard user={user} setActiveTab={setActiveTab} />}
      {activeTab === 'syllabus' && <Syllabus />}
      {activeTab === 'oracle' && <Oracle user={user} />}
      {activeTab === 'cartographer' && <Cartographer user={user} />}
      {activeTab === 'folio' && <Folio user={user} />}
      {activeTab === 'news' && <NewsDesk user={user} />}
      {activeTab === 'archives' && <Library user={user} isAdmin={isAdmin} />}
      {activeTab === 'vault' && <PersonalVault user={user} />}
      {activeTab === 'subscription' && <Subscription user={user} />}
      {activeTab === 'support' && <Support user={user} />}
      {activeTab === 'profile' && <Profile user={user} />}
      {activeTab === 'vizier-studio' && <VizierStudio user={user} />}
      {activeTab === 'community' && <Community user={user} isAdmin={isAdmin} />}
      {activeTab === 'peer-chat' && <PeerChat user={user} />}
      {activeTab === 'resources' && <ResourceFeed user={user} isAdmin={isAdmin} />}
      {activeTab === 'rules' && isAdmin && <RulesAndRegulations user={user} />}
      {activeTab === 'owner-settings' && isAdmin && <OwnerSettings user={user} />}
      
      <SocialSidebar />
    </Layout>
  );
}
