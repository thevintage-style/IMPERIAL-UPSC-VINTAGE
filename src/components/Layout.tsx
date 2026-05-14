import React from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
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
  Star,
  Settings,
  Table,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OracleOS } from './OracleOS';
import { cn } from '../lib/utils';

import { UserProfile } from '../types';

interface LayoutProps {
  user: SupabaseUser;
  profile: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onEntrySelect?: (entryId: string) => void;
  children: React.ReactNode;
}

export function Layout({ user, profile, activeTab, setActiveTab, onEntrySelect, children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [activeOffers, setActiveOffers] = React.useState<any[]>([]);
  const [journalEntries, setJournalEntries] = React.useState<any[]>([]);
  const [openFolders, setOpenFolders] = React.useState<string[]>(['Journals', 'Logs', 'Canvases']);

  React.useEffect(() => {
    const fetchOffers = async () => {
      const { data } = await supabase
        .from('discount_offers')
        .select('*')
        .eq('is_active', true);
      
      if (data) setActiveOffers(data);
    };
    
    const fetchEntries = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('journal_entries')
        .select('id, title, entry_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) setJournalEntries(data);
    };

    fetchOffers();
    fetchEntries();

    const channel = supabase.channel('journal_entries_sidebar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries', filter: `user_id=eq.${user.id}` }, fetchEntries)
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const toggleFolder = (folder: string) => {
    setOpenFolders(prev => 
      prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder]
    );
  };

  const navItems = [
    { id: 'dashboard', label: 'Imperial Home', icon: LayoutDashboard },
    { id: 'syllabus', label: 'Syllabus', icon: Book },
    { id: 'cartographer', label: 'AI Map Suite', icon: MapIcon },
    { id: 'folio', label: 'Log Book', icon: PenTool },
    { id: 'resource-hub', label: 'Resource Hub', icon: LibraryIcon },
    { id: 'vault', label: 'Personal Vault', icon: Archive },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'peer-chat', label: 'Peer Network', icon: Zap },
    { id: 'news', label: 'News Desk', icon: Newspaper },
    { id: 'oracle', label: 'The Oracle', icon: Sparkles },
    { id: 'subscription', label: 'Commission', icon: Crown },
    { id: 'support', label: 'Vizier Support', icon: MessageCircle },
  ];

  if (user?.email === "raksha05jk.rao@gmail.com") {
    navItems.push({ id: 'vizier-control', label: 'Vizier Control', icon: Shield });
    navItems.push({ id: 'vizier-studio', label: 'Vizier Forge', icon: Cpu });
    navItems.push({ id: 'rules', label: 'Regulation Vault', icon: Gavel });
    navItems.push({ id: 'owner-settings', label: 'Owner Logic', icon: Settings });
  }

  const handleLogout = async () => {
    try {
      await supabaseSignOut();
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback in case the imported function fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed] flex font-sans text-leather">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-leather/20 flex flex-col shadow-sm z-20"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-1"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-leather rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-parchment font-serif font-bold">I</span>
                </div>
                <span className="font-serif font-bold text-lg tracking-tight">Imperial</span>
              </div>
              <div className="mt-2">
                <p className="text-[10px] font-serif font-bold text-sage tracking-[0.2em] uppercase gold-leaf-text">
                  सत्यमेव जयते
                </p>
                <p className="text-[8px] font-serif italic text-leather/60 uppercase tracking-widest">
                  Truth Alone Triumphs
                </p>
              </div>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-parchment rounded-lg transition-colors text-leather"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <nav className="px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group relative",
                  activeTab === item.id 
                    ? "bg-leather text-parchment shadow-md" 
                    : "hover:bg-parchment text-leather/60 hover:text-leather"
                )}
              >
                <item.icon size={20} className={cn(activeTab === item.id ? "text-lime" : "group-hover:scale-110 transition-transform")} />
                {isSidebarOpen && (
                  <span className="font-serif font-medium tracking-wide text-xs">{item.label}</span>
                )}
                {activeTab === item.id && (
                  <motion.div layoutId="nav-glow" className="absolute inset-0 bg-lime/5 rounded-xl border border-lime/20 pointer-events-none" />
                )}
              </button>
            ))}

            {isSidebarOpen && (
              <div className="mt-8 space-y-4">
                <div className="px-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-leather/40 mb-4">Imperial Records</p>
                </div>
                
                {['Journal', 'Log', 'Canvas'].map((type) => {
                  const label = type === 'Journal' ? 'Journals' : type === 'Log' ? 'Logs' : 'Canvases';
                  const Icon = type === 'Journal' ? Book : type === 'Log' ? Table : PenTool;
                  const filtered = journalEntries.filter(e => e.entry_type === type);
                  const isOpen = openFolders.includes(label);

                  return (
                    <div key={type} className="space-y-1">
                      <button 
                        onClick={() => toggleFolder(label)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-leather/5 text-leather/80 group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} className="text-saddle-brown/60 group-hover:text-leather" />
                          <span className="text-xs font-serif font-bold">{label}</span>
                        </div>
                        <ChevronRight size={14} className={cn("transition-transform", isOpen && "rotate-90")} />
                      </button>
                      
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden ml-4 pl-4 border-l border-leather/10 space-y-1"
                          >
                            {filtered.length > 0 ? filtered.map((entry) => (
                              <button
                                key={entry.id}
                                onClick={() => {
                                  setActiveTab('folio');
                                  if (onEntrySelect) onEntrySelect(entry.id);
                                }}
                                className="w-full text-left p-2 rounded-lg text-[11px] font-serif text-leather/60 hover:text-leather hover:bg-leather/5 truncate block transition-colors"
                              >
                                {entry.title}
                              </button>
                            )) : (
                              <span className="text-[10px] italic text-leather/30 p-2 block">No records found</span>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-leather/10">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "w-full flex items-center gap-3 p-2 mb-4 rounded-xl transition-all",
              activeTab === 'profile' ? "bg-leather/5 border border-leather/20" : "hover:bg-parchment"
            )}
          >
            <div className="relative">
              <img 
                src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-leather/20 shadow-sm"
                referrerPolicy="no-referrer"
              />
              {profile?.rank && (
                <div className="absolute -bottom-1 -right-1 bg-lime p-0.5 rounded-full shadow-sm border border-white">
                  <Star size={8} className="text-leather" />
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-sm font-bold truncate text-leather">{profile?.full_name || user.user_metadata?.full_name}</span>
                <span className="text-[10px] text-leather/60 truncate italic font-serif uppercase tracking-widest font-bold">
                  {profile?.plan_type ? profile.plan_type.toUpperCase() : 'Aspirant'}
                </span>
              </div>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="font-serif font-medium">Retire</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F5F2E7]/30">
        {activeOffers.length > 0 && (
          <div className="bg-leather text-parchment py-2 px-4 flex items-center justify-center gap-4 overflow-hidden whitespace-nowrap border-b border-white/10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeOffers[0].id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Zap size={14} className="text-lime animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                  Limited Offer: Use code <span className="text-lime">{activeOffers[0].code}</span> for {activeOffers[0].discountPercentage}% off!
                </span>
                <button 
                  onClick={() => setActiveTab('subscription')}
                  className="text-[10px] font-bold underline ml-2 hover:text-lime transition-colors"
                >
                  Claim Now
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        <header className="h-16 bg-white/40 backdrop-blur-xl border-b border-leather/10 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-serif text-xl font-bold text-leather">
              {navItems.find(i => i.id === activeTab)?.label}
            </h2>
            <div className="h-4 w-[1px] bg-leather/20" />
            <span className="text-[10px] font-serif font-bold uppercase tracking-widest text-leather/40">
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-leather/5 rounded-full border border-leather/10">
              <div className="w-2 h-2 bg-lime rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-leather">Archives Live</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
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

      <OracleOS user={user as any} />
      
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
