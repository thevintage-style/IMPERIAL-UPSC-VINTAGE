import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Check, Shield, Zap, Crown, CreditCard, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { UserProfile, Plan } from '../types';

interface SubscriptionProps {
  user: SupabaseUser;
  profile: UserProfile | null;
}

export function Subscription({ user, profile }: SubscriptionProps) {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstamojoPayment = (plan: Plan) => {
    if (plan.instamojo_url) {
     window.location.href = `${plan.instamojo_url}?embed=form&redirect_url=${window.location.origin}/dashboard`;
    } else {
      alert("This plan is currently being finalized in the Imperial Treasury. Please try again later.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-[#5A5A40]" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-16">
      <div className="text-center">
        <h2 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-4">Commission Your Future</h2>
        <p className="text-[#5A5A40] font-serif italic text-lg">Choose the rank that suits your ambition.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -10 }}
            className={`relative p-8 rounded-[40px] border-2 transition-all duration-300 flex flex-col ${
              plan.highlight 
                ? "bg-[#1a1a1a] border-[#5A5A40] text-white shadow-2xl" 
                : "bg-white border-[#5A5A40]/10 text-[#1a1a1a] shadow-lg"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#5A5A40] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                Recommended
              </div>
            )}
            
            <div className="flex items-center justify-between mb-8">
              <div className={`p-4 rounded-3xl ${plan.highlight ? "bg-[#5A5A40]/20" : "bg-[#f5f2ed]"}`}>
                <Crown size={32} className="text-[#5A5A40]" />
              </div>
              <div className="text-right">
                <span className="text-4xl font-serif font-bold">₹{plan.price}</span>
                <span className={`text-sm block ${plan.highlight ? "text-white/60" : "text-[#5A5A40]/60"}`}>/ Access Tier</span>
              </div>
            </div>

            <h3 className="text-2xl font-serif font-bold mb-2">{plan.name}</h3>
            <p className={`text-sm mb-8 font-serif italic ${plan.highlight ? "text-white/60" : "text-[#5A5A40]/60"}`}>
              Official Imperial Grade
            </p>

            <ul className="space-y-4 mb-12 flex-1">
              {(plan.features || []).map((feature: string, fIdx: number) => (
                <li key={fIdx} className="flex items-center gap-3 text-sm">
                  <div className={`p-1 rounded-full ${plan.highlight ? "bg-[#5A5A40]/40" : "bg-[#5A5A40]/10"}`}>
                    <Check size={12} className="text-[#5A5A40]" />
                  </div>
                  <span className="font-serif">{feature}</span>
                </li>
              ))}
            </ul>

            {profile?.plan_type === 'Imperial' && plan.name.toLowerCase().includes('imperial') ? (
              <Button
                disabled
                className="w-full py-8 rounded-2xl text-lg font-bold bg-[#1A1612]/5 text-[#1A1612]/40"
              >
                Current Active Plan
              </Button>
            ) : plan.price === 0 && (!profile || profile.plan_type === 'Free') ? (
               <Button
                disabled
                className="w-full py-8 rounded-2xl text-lg font-bold bg-[#1A1612]/5 text-[#1A1612]/40"
              >
                Current Plan
              </Button>
            ) : (
              <Button
                onClick={() => handleInstamojoPayment(plan)}
                disabled={submitting}
                className={`w-full py-8 rounded-2xl text-lg font-bold transition-all duration-300 ${
                  plan.highlight 
                    ? "bg-[#D4AF37] hover:bg-[#8B4513] text-white shadow-lg" 
                    : "bg-[#F5F2E7] text-[#8B4513] hover:bg-[#1A1612]/10"
                }`}
              >
                {submitting ? "Preparing Tribute..." : "Commission Now"}
              </Button>
            )}
          </motion.div>
        ))}
      </div>

      <div className="bg-[#5A5A40]/5 p-8 rounded-[32px] border border-[#5A5A40]/10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white rounded-2xl shadow-sm">
            <Shield className="text-[#5A5A40]" size={32} />
          </div>
          <div className="flex-1">
            <h4 className="font-serif font-bold text-lg">Secure Transactions</h4>
            <p className="text-sm text-[#5A5A40]/60 font-serif mb-2">All payments are manually verified by the Grand Vizier.</p>
            <p className="text-xs font-bold text-[#8B4513] uppercase tracking-wider bg-[#D4AF37]/10 p-3 rounded-xl border border-[#D4AF37]/20">
              Note: After payment, please wait for admin verification to activate your pro features.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <CreditCard className="text-[#5A5A40]/40" size={24} />
          <span className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/40">Verified Payment Channel</span>
        </div>
      </div>
    </div>
  );
}
