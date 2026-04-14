import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { auth, signOut as firebaseSignOut } from '../lib/firebase';
import { supabase, signOut as supabaseSignOut } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  PenTool, 
  Newspaper, 
  Sparkles, 
  LogOut,
  Menu,
  X,
  Crown,
  Shield,
  Library as LibraryIcon,
  Book,
  Zap,
  MessageCircle,
  Cpu,
  Users,
  BookOpen,
  Gavel,
  Archive,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StatueOfUnity } from './StatueOfUnity';
import { SocialSidebar } from './SocialSidebar';
import { OracleFloating } from './OracleFloating';
import { db, collection, onSnapshot, query, where, doc } from '../lib/firebase';
import { cn } from '../lib/utils';

interface LayoutProps {
  user: FirebaseUser | SupabaseUser;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export function Layout({ user, activeTab, setActiveTab, children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [activeOffers, setActiveOffers] = React.useState<any[]>([]);
  const [userProfile, setUserProfile] = React.useState<any>(null);

  React.useEffect(() => {
    const uid = (user as any).uid || (user as any).id;
    if (!uid) return;
    const userRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      }
    }, (error) => {
      console.error("User Profile Listener Error:", error);
    });
    return () => unsubscribe();
  }, [(user as any).uid || (user as any).id]);

  React.useEffect(() => {
    const q = query(collection(db, 'discountOffers'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveOffers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Discount Offers Listener Error:", error);
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Imperial Home', icon: LayoutDashboard },
    { id: 'syllabus', label: 'Syllabus', icon: Book },
    { id: 'cartographer', label: 'AI Map Suite', icon: MapIcon },
    { id: 'folio', label: 'Log Book', icon: PenTool },
    { id: 'archives', label: 'Imperial Library', icon: LibraryIcon },
    { id: 'vault', label: 'Personal Vault', icon: Archive },
    { id: 'resources', label: 'Resource Feed', icon: BookOpen },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'peer-chat', label: 'Peer Network', icon: Zap },
    { id: 'news', label: 'News Desk', icon: Newspaper },
    { id: 'oracle', label: 'The Oracle', icon: Sparkles },
    { id: 'subscription', label: 'Commission', icon: Crown },
    { id: 'support', label: 'Vizier Support', icon: MessageCircle },
  ];

  if (user?.email === "raksha05jk.rao@gmail.com") {
    navItems.push({ id: 'vizier-studio', label: 'Vizier Forge', icon: Cpu });
    navItems.push({ id: 'rules', label: 'Regulation Vault', icon: Gavel });
    navItems.push({ id: 'owner-settings', label: 'Vizier', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-[#f5f2ed] flex font-sans text-[#1a1a1a]">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-[#5A5A40]/20 flex flex-col shadow-sm z-20"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-1"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#5A5A40] rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-serif font-bold">I</span>
                </div>
                <span className="font-serif font-bold text-lg tracking-tight">Imperial</span>
              </div>
              <div className="mt-2">
                <p className="text-[10px] font-serif font-bold text-[#D4AF37] tracking-[0.2em] uppercase gold-leaf-text">
                  सत्यमेव जयते
                </p>
                <p className="text-[8px] font-serif italic text-[#5A5A40]/60 uppercase tracking-widest">
                  Truth Alone Triumphs
                </p>
              </div>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-[#f5f2ed] rounded-lg transition-colors text-[#5A5A40]"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-[#5A5A40] text-white shadow-md" 
                  : "hover:bg-[#f5f2ed] text-[#5A5A40]"
              )}
            >
              <item.icon size={22} className={cn(activeTab === item.id ? "text-white" : "group-hover:scale-110 transition-transform")} />
              {isSidebarOpen && (
                <span className="font-serif font-medium tracking-wide">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#5A5A40]/10">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "w-full flex items-center gap-3 p-2 mb-4 rounded-xl transition-all",
              activeTab === 'profile' ? "bg-saddle-brown/10 border border-saddle-brown/20" : "hover:bg-parchment"
            )}
          >
            <div className="relative">
              <img 
                src={(user as any).photoURL || (user as any).user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(user as any).uid || (user as any).id}`} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-[#5A5A40]/20"
                referrerPolicy="no-referrer"
              />
              {userProfile?.avatarId && (
                <div className="absolute -bottom-1 -right-1 bg-antique-gold p-0.5 rounded-full shadow-sm border border-white">
                  <Star size={8} className="text-leather" />
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-sm font-bold truncate">{userProfile?.displayName || (user as any).displayName || (user as any).user_metadata?.full_name}</span>
                <span className="text-xs text-[#5A5A40]/60 truncate italic font-serif">
                  {userProfile?.avatarId ? userProfile.avatarId.split('-')[0].toUpperCase() : 'Aspirant'}
                </span>
              </div>
            )}
          </button>
          <button
            onClick={async () => {
              if ((user as any).aud === 'authenticated') {
                await supabaseSignOut();
              } else {
                await firebaseSignOut(auth);
              }
            }}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="font-serif font-medium">Retire</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {activeOffers.length > 0 && (
          <div className="bg-[#5A5A40] text-white py-2 px-4 flex items-center justify-center gap-4 overflow-hidden whitespace-nowrap">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeOffers[0].id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Zap size={14} className="text-yellow-400" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Limited Offer: Use code <span className="text-yellow-400">{activeOffers[0].code}</span> for {activeOffers[0].discountPercentage}% off!
                </span>
                <button 
                  onClick={() => setActiveTab('subscription')}
                  className="text-[10px] font-bold underline ml-2 hover:text-yellow-400 transition-colors"
                >
                  Claim Now
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        <header className="h-16 bg-white/80 backdrop-blur-md border-bottom border-[#5A5A40]/10 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-serif text-xl font-bold text-[#1a1a1a]">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
            <div className="h-4 w-[1px] bg-[#5A5A40]/20" />
            <span className="text-xs font-serif italic text-[#5A5A40]/60">
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#5A5A40]/5 rounded-full border border-[#5A5A40]/10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">Archives Live</span>
            </div>
          </div>
        </header>

        {/* Imperial Sidebar Stack - Statue + Social Icons */}
        <div className="fixed bottom-8 right-10 z-[6000] flex flex-col items-center gap-6 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="pointer-events-auto"
          >
            <SocialSidebar />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto"
          >
            <StatueOfUnity />
          </motion.div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <OracleFloating user={user} />

      <style>{`
        .gold-leaf-text {
          background: linear-gradient(45deg, #D4AF37, #F9F295, #D4AF37, #B8860B, #D4AF37);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 200% auto;
          animation: shine 4s linear infinite;
          text-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }
        @keyframes shine {
          to { background-position: 200% center; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #5A5A4033;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #5A5A4066;
        }
      `}</style>
    </div>
  );
}
