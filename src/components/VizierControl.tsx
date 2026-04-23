import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  Shield, 
  Users, 
  CreditCard, 
  TrendingUp, 
  UserCheck, 
  MessageSquare, 
  Settings, 
  CheckCircle, 
  XCircle,
  Search,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, getDocs, doc, updateDoc, query, orderBy } from '../lib/firebase';
import { supabase } from '../lib/supabase';

interface VizierControlProps {
  user: FirebaseUser;
}

interface CitizenEntry {
  uid: string;
  displayName: string;
  email: string;
  subscriptionStatus: 'free' | 'premium';
  role: 'admin' | 'user';
  lastLoginAt: string;
}

interface SupportTicket {
  id: string;
  userEmail: string;
  subject: string;
  status: 'open' | 'resolved';
  createdAt: any;
}

export function VizierControl({ user }: VizierControlProps) {
  const [activeModule, setActiveModule] = useState<'vault' | 'registry' | 'gatekeeper'>('vault');
  const [citizens, setCitizens] = useState<CitizenEntry[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    setIsLoading(true);
    try {
      // Fetch Citizens (from Firestore users collection)
      const usersSnap = await getDocs(collection(db, 'users'));
      const citizensData = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as CitizenEntry));
      setCitizens(citizensData);

      // Fetch Tickets (from supportMessages)
      const ticketsSnap = await getDocs(query(collection(db, 'supportMessages'), orderBy('createdAt', 'desc')));
      setTickets(ticketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));

    } catch (error) {
      console.error("Vizier Audit Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePremium = async (uid: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'premium' ? 'free' : 'premium';
      await updateDoc(doc(db, 'users', uid), { subscriptionStatus: newStatus });
      setCitizens(prev => prev.map(c => c.uid === uid ? { ...c, subscriptionStatus: newStatus as any } : c));
    } catch (error) {
      console.error("Gatekeeper Toggle Error:", error);
    }
  };

  const stats = {
    revenue: citizens.filter(c => c.subscriptionStatus === 'premium').length * 1499,
    activeCitizens: citizens.length,
    openTickets: tickets.filter(t => t.status === 'open').length,
    growth: "+14%"
  };

  const filteredCitizens = citizens.filter(c => 
    c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-8">
      {/* Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Citizens', value: stats.activeCitizens, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Open Tickets', value: stats.openTickets, icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'System Growth', value: stats.growth, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="glass-morphism p-6 rounded-3xl border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-bold text-green-500 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                <ArrowUpRight size={10} /> {stat.label === 'System Growth' ? 'Live' : '+12%'}
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60">{stat.label}</p>
            <h4 className="text-2xl font-serif font-bold text-[#1a1a1a] mt-1">{stat.value}</h4>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-[#F5F2E7]/50 p-1.5 rounded-2xl border border-[#5A5A40]/10 w-fit">
        {[
          { id: 'vault', label: 'Monetary Vault', icon: CreditCard },
          { id: 'registry', label: 'Citizen Registry', icon: Users },
          { id: 'gatekeeper', label: 'Gatekeeper Settings', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveModule(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeModule === tab.id 
                ? 'bg-[#5A5A40] text-white shadow-lg' 
                : 'text-[#5A5A40]/40 hover:text-[#5A5A40]'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Module Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeModule === 'vault' && (
            <motion.div 
              key="vault"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <div className="glass-morphism p-8 rounded-[40px] border border-white/30 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-2xl font-bold mb-2">Vault Liquidity</h3>
                  <p className="text-sm text-[#5A5A40]/60 italic mb-8">Real-time subscription analysis for the Vizier.</p>
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-center p-4 bg-white/40 rounded-2xl border border-white/20">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#5A5A40]/40">Imperial Premium (Yearly)</p>
                        <p className="font-bold">₹1,499.00</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-green-500">Active</p>
                        <p className="font-bold">{citizens.filter(c => c.subscriptionStatus === 'premium').length}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/40 rounded-2xl border border-white/20 opacity-50">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#5A5A40]/40">Imperial Lite (Monthly)</p>
                        <p className="font-bold">₹499.00</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-gray-500">Inactive</p>
                        <p className="font-bold">0</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-[#5A5A40] text-white rounded-2xl py-6 font-bold shadow-xl">
                  Download Financial Scrolls
                </Button>
              </div>

              <div className="glass-morphism p-8 rounded-[40px] border border-white/30">
                <h3 className="font-serif text-2xl font-bold mb-6">Recent Tribute</h3>
                <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                  {citizens.filter(c => c.subscriptionStatus === 'premium').map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/20 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#5A5A40]/10 rounded-full flex items-center justify-center font-bold text-[#5A5A40]">
                          {c.displayName?.[0] || 'S'}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{c.displayName}</p>
                          <p className="text-[10px] text-[#5A5A40]/40">{c.email}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-green-500">+₹1,499</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeModule === 'registry' && (
            <motion.div 
              key="registry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col gap-6"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A5A40]/40" size={18} />
                <input 
                  type="text"
                  placeholder="Seach citizens by name or parchment address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full glass-morphism border border-white/30 rounded-2xl py-4 pl-12 pr-4 font-serif outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                />
              </div>

              <div className="flex-1 glass-morphism rounded-[40px] border border-white/30 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 grid grid-cols-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5A5A40]/40">
                  <div className="col-span-2">Citizen Identity</div>
                  <div>Status</div>
                  <div className="text-right">Actions</div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {filteredCitizens.map(citizen => (
                    <div key={citizen.uid} className="grid grid-cols-4 items-center p-4 bg-white/20 rounded-2xl border border-white/10 group hover:bg-white/40 transition-all">
                      <div className="col-span-2 flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center text-white font-bold shadow-md">
                          {citizen.displayName?.[0] || 'C'}
                        </div>
                        <div>
                          <p className="font-serif font-bold text-leather">{citizen.displayName}</p>
                          <p className="text-[10px] text-[#5A5A40]/40 italic">{citizen.email}</p>
                        </div>
                      </div>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                          citizen.subscriptionStatus === 'premium' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {citizen.subscriptionStatus}
                        </span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button className="p-2 hover:bg-white/60 rounded-xl transition-colors"><Settings size={16} className="text-[#5A5A40]/40" /></button>
                        <button className="p-2 hover:bg-white/60 rounded-xl transition-colors text-[#5A5A40]/40"><MessageSquare size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeModule === 'gatekeeper' && (
            <motion.div 
              key="gatekeeper"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="h-full flex flex-col gap-6"
            >
              <div className="glass-morphism p-10 rounded-[40px] border border-white/30 text-center space-y-4 max-w-2xl mx-auto">
                <Shield size={64} className="text-[#5A5A40] mx-auto opacity-20" />
                <h3 className="text-3xl font-serif font-bold">The Gatekeeper's Seal</h3>
                <p className="text-[#5A5A40]/60 italic">As the Grand Vizier, you hold the authority to grant or revoke Imperial access. Use this weight responsibly.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {citizens.slice(0, 10).map(citizen => (
                  <div key={citizen.uid} className="glass-morphism p-6 rounded-3xl border border-white/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg ${
                        citizen.subscriptionStatus === 'premium' ? 'bg-antique-gold' : 'bg-gray-300'
                      }`}>
                        {citizen.displayName?.[0] || 'C'}
                      </div>
                      <div>
                        <p className="font-serif font-bold text-leather leading-tight">{citizen.displayName}</p>
                        <p className="text-[10px] text-[#5A5A40]/40 italic">{citizen.email}</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => togglePremium(citizen.uid, citizen.subscriptionStatus)}
                      className={`px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest ${
                        citizen.subscriptionStatus === 'premium' 
                        ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-100' 
                        : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-100'
                      }`}
                    >
                      {citizen.subscriptionStatus === 'premium' ? 'Revoke Access' : 'Grant Premium'}
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
