import React, { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { 
  Shield, 
  Users, 
  CreditCard, 
  Activity,
  ArrowUpRight,
  MessageSquare,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ExternalLink,
  Search
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Plan, UserProfile } from '../types';

interface VizierControlProps {
  user: SupabaseUser;
}

export function VizierControl({ user }: VizierControlProps) {
  const [activeModule, setActiveModule] = useState<'vault' | 'registry' | 'plans' | 'gatekeeper'>('vault');
  const [citizens, setCitizens] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Plan Editor State
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    setIsLoading(true);
    try {
      // Fetch Citizens (from Supabase user_profiles)
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*');
      
      if (profileError) throw profileError;
      setCitizens(profiles || []);

      // Fetch Plans
      const { data: plansData, error: planError } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });
      
      if (planError) throw planError;
      setPlans(plansData || []);

    } catch (error) {
      console.error("Vizier Audit Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePlan = async () => {
    if (!editingPlan) return;
    try {
      const planToSave = {
        ...editingPlan,
        updated_at: new Date().toISOString()
      };
      
      // If it's a new plan, we don't send the ID if it's not set
      if (!planToSave.id) {
        delete (planToSave as any).id;
      }

      const { error } = await supabase
        .from('plans')
        .upsert(planToSave);
      
      if (error) throw error;
      setEditingPlan(null);
      fetchMetadata();
    } catch (error) {
      console.error("Error saving plan:", error);
      alert("Imperial Decree Failed: Could not save plan archives.");
    }
  };

  const togglePremium = async (uid: string, currentPlan: string) => {
    try {
      const isImperial = currentPlan === 'Imperial';
      const newPlan = isImperial ? 'Free' : 'Imperial';
      // If upgrading to imperial, set a default expiration (e.g., 30 days)
      const expiresAt = !isImperial ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          plan_type: newPlan,
          subscription_expires_at: expiresAt
        })
        .eq('id', uid);
      
      if (error) throw error;
      setCitizens(prev => prev.map(c => c.id === uid ? { ...c, plan_type: newPlan } : c));
    } catch (error) {
      console.error("Gatekeeper Toggle Error:", error);
    }
  };

  const stats = {
    revenue: citizens.filter(c => c.plan_type === 'Imperial').length * 99, // Updated for Imperial price
    activeCitizens: citizens.length,
    activePlans: plans.filter(p => p.is_active).length,
    growth: "+14%"
  };

  const filteredCitizens = citizens.filter(c => 
    (c.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-8">
      {/* Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Citizens', value: stats.activeCitizens, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Active Plans', value: stats.activePlans, icon: Shield, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'System Growth', value: stats.growth, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="glass-morphism p-6 rounded-3xl border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60">{stat.label}</p>
            <h4 className="text-2xl font-serif font-bold text-[#1a1a1a] mt-1">{stat.value}</h4>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-[#F5F2E7]/50 p-1.5 rounded-2xl border border-[#5A5A40]/10 w-fit overflow-x-auto max-w-full">
        {[
          { id: 'vault', label: 'Treasury', icon: CreditCard },
          { id: 'registry', label: 'Registry', icon: Users },
          { id: 'plans', label: 'Imperial Plans', icon: Shield },
          { id: 'gatekeeper', label: 'Gatekeeper', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveModule(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
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
              className="h-full grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <div className="glass-morphism p-8 rounded-[40px] border border-white/30 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-2xl font-bold mb-2">Monetary Vault</h3>
                  <p className="text-sm text-[#5A5A40]/60 italic mb-8">Real-time subscription analysis for the Vizier.</p>
                  
                  <div className="space-y-4">
                    {plans.map(plan => (
                      <div key={plan.id} className="flex justify-between items-center p-4 bg-white/40 rounded-2xl border border-white/20">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-[#5A5A40]/40">{plan.name}</p>
                          <p className="font-bold">₹{plan.price}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-green-500">Active Citizens</p>
                          <p className="font-bold">{citizens.filter(c => c.plan_type === 'Imperial' && plan.name.toLowerCase().includes('imperial')).length}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeModule === 'plans' && (
            <motion.div key="plans" className="h-full flex flex-col gap-6 overflow-y-auto">
              <div className="flex justify-between items-center bg-[#F5F2E7]/80 p-6 rounded-3xl border border-[#5A5A40]/10">
                <div>
                  <h3 className="text-2xl font-serif font-bold">Imperial Tiers</h3>
                  <p className="text-sm text-[#5A5A40]/60 italic font-serif">Curate the offerings of the Imperial Academy.</p>
                </div>
                <Button 
                  onClick={() => setEditingPlan({ name: 'New Plan', price: 999, is_active: true, features: [] })}
                  className="bg-[#5A5A40] text-white rounded-xl flex items-center gap-2"
                >
                  <Plus size={18} /> New Blueprint
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
                {plans.map(plan => (
                  <div key={plan.id} className="glass-morphism p-8 rounded-[40px] border border-white/30 relative group">
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setEditingPlan(plan)}
                        className="p-2 hover:bg-[#5A5A40]/10 rounded-xl"
                      >
                        <Edit2 size={16} className="text-[#5A5A40]" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="p-2 hover:bg-red-50 rounded-xl"
                        onClick={async () => {
                          if (confirm("Confirm deletion of this archive?")) {
                            await supabase.from('plans').delete().eq('id', plan.id);
                            fetchMetadata();
                          }
                        }}
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </Button>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-2xl font-serif font-bold mb-1">{plan.name}</h4>
                      <p className="text-3xl font-serif font-bold text-[#8B4513]">₹{plan.price}</p>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="p-4 bg-[#F5F2E7]/40 rounded-2xl border border-white/20">
                        <p className="text-[10px] uppercase font-bold text-[#5A5A40]/40 mb-1">Instamojo Link</p>
                        <a 
                          href={plan.instamojo_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-mono text-[#D4AF37] break-all hover:underline flex items-center gap-2"
                        >
                          {plan.instamojo_url || "No link assigned"} <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {plan.features?.map((f, i) => (
                        <span key={i} className="text-[10px] bg-white/40 px-3 py-1 rounded-full border border-white/20 font-serif italic">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Plan Overlay Editor */}
              {editingPlan && (
                <div className="fixed inset-0 bg-[#1A1612]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#F5F2E7] w-full max-w-2xl rounded-[40px] p-10 border-4 border-[#8B4513] shadow-2xl overflow-y-auto max-h-[90vh]"
                  >
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-3xl font-serif font-bold">Forge Plan Archive</h3>
                      <button onClick={() => setEditingPlan(null)} className="p-2 hover:bg-[#1A1612]/5 rounded-full"><X size={24} /></button>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">Divine Name</label>
                          <input 
                            value={editingPlan.name} 
                            onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
                            className="w-full bg-white/50 border border-[#8B4513]/20 rounded-xl px-4 py-3 font-serif outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">Tribute Price (₹)</label>
                          <input 
                            type="number"
                            value={editingPlan.price} 
                            onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})}
                            className="w-full bg-white/50 border border-[#8B4513]/20 rounded-xl px-4 py-3 font-serif outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">Instamojo Payment URL</label>
                        <input 
                          value={editingPlan.instamojo_url} 
                          onChange={e => setEditingPlan({...editingPlan, instamojo_url: e.target.value})}
                          placeholder="Paste the sacred payment link here..."
                          className="w-full bg-white/50 border border-[#8B4513]/20 rounded-xl px-4 py-3 font-serif outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">Plan Description</label>
                        <textarea 
                          value={editingPlan.description} 
                          onChange={e => setEditingPlan({...editingPlan, description: e.target.value})}
                          className="w-full bg-white/50 border border-[#8B4513]/20 rounded-xl px-4 py-3 font-serif outline-none h-24"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <input 
                          type="checkbox" 
                          checked={editingPlan.highlight} 
                          onChange={e => setEditingPlan({...editingPlan, highlight: e.target.checked})}
                          className="w-5 h-5 accent-[#8B4513]"
                        />
                        <label className="text-sm font-serif font-bold">Highlight as Imperial Choice</label>
                      </div>

                      <div className="pt-4 flex gap-4">
                        <Button 
                          onClick={savePlan}
                          className="flex-1 bg-[#8B4513] text-white py-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#1A1612] transition-colors"
                        >
                          <Save size={20} /> Consign to Archives
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {activeModule === 'registry' && (
            <motion.div key="registry" className="h-full flex flex-col gap-6">
               <div className="flex-1 glass-morphism rounded-[40px] border border-white/30 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 grid grid-cols-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5A5A40]/40">
                  <div className="col-span-2">Citizen Identity</div>
                  <div>Status</div>
                  <div className="text-right">Access Control</div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {filteredCitizens.map(citizen => (
                    <div key={citizen.id} className="grid grid-cols-4 items-center p-4 bg-white/20 rounded-2xl border border-white/10 group hover:bg-white/40 transition-all">
                      <div className="col-span-2 flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center text-white font-bold shadow-md">
                          {citizen.full_name?.[0] || 'C'}
                        </div>
                        <div>
                          <p className="font-serif font-bold text-leather">{citizen.full_name}</p>
                          <p className="text-[10px] text-[#5A5A40]/40 italic">{citizen.email}</p>
                        </div>
                      </div>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                          citizen.plan_type === 'Imperial' ? 'bg-green-100 text-green-600' : citizen.plan_type === 'Expired' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {citizen.plan_type}
                        </span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          onClick={() => togglePremium(citizen.id, citizen.plan_type)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase ${
                            citizen.plan_type === 'Imperial' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                          }`}
                        >
                          {citizen.plan_type === 'Imperial' ? 'Revoke' : 'Upgrade'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeModule === 'gatekeeper' && (
            <motion.div key="gatekeeper" className="h-full flex flex-col items-center justify-center p-10 text-center">
               <Shield size={120} className="text-[#5A5A40] opacity-10 mb-8" />
               <h3 className="text-4xl font-serif font-bold mb-4">The Gatekeeper's Vault</h3>
               <p className="max-w-md text-[#5A5A40]/60 italic font-serif">Advanced security protocols and system-wide overrides for the Imperial Overseer.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
