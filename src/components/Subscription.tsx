import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, doc, updateDoc, serverTimestamp, getDoc, addDoc, collection, OperationType, handleFirestoreError, onSnapshot, query, setDoc } from '../lib/firebase';
import { Check, Shield, Zap, Crown, CreditCard, QrCode, Copy, Send, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';

interface SubscriptionProps {
  user: User;
}

export function Subscription({ user }: SubscriptionProps) {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [activeUpi, setActiveUpi] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch Plans
    const plansPath = 'plans';
    const unsubscribePlans = onSnapshot(collection(db, plansPath), (snapshot) => {
      const activePlans = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => p.isActive);
      setPlans(activePlans);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, plansPath);
    });

    // Fetch and Rotate UPI
    const rotateUpi = async () => {
      const configRef = doc(db, 'settings/appConfig');
      const configSnap = await getDoc(configRef);
      const upiIdsSnap = await getDoc(doc(db, 'upiIds', 'list')); // This is a bit inefficient, better to use a collection
      
      // Let's use the collection instead
      const upisQuery = query(collection(db, 'upiIds'));
      const upisSnap = await getDoc(doc(db, 'settings/appConfig')); // Re-using for counter
      
      const upiListSnapshot = await onSnapshot(collection(db, 'upiIds'), (snapshot) => {
        const activeUpis = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter((u: any) => u.isActive);
        
        if (activeUpis.length === 0) return;

        // Rotation Logic: Every 10th student
        const currentCounter = configSnap.data()?.upiRotationCounter || 0;
        const upiIndex = Math.floor(currentCounter / 10) % activeUpis.length;
        setActiveUpi(activeUpis[upiIndex].upiId);
      });
    };

    rotateUpi();
    return () => unsubscribePlans();
  }, []);

  const handleRazorpayPayment = async (plan: any) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: plan.price })
      });
      const order = await response.json();

      if (order.error) throw new Error(order.error);

      const options = {
        key: process.env.VITE_RAZORPAY_KEY_ID || "rzp_test_mock",
        amount: order.amount,
        currency: order.currency,
        name: "Imperial Scholar",
        description: `Commission for ${plan.name}`,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Imperial",
        order_id: order.id,
        handler: async function (response: any) {
          // Verify payment on client side (optional but good for UX)
          alert("Tribute received! The Grand Vizier is processing your commission.");
          // In a real app, you'd call a verification API here
          // For now, we rely on the webhook to update the DB
        },
        prefill: {
          name: user.displayName,
          email: user.email,
        },
        notes: {
          userId: user.uid,
          planId: plan.id
        },
        theme: {
          color: "#8B4513"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Payment Error:", error);
      alert("The Imperial Treasury encountered an error: " + error.message);
    } finally {
      setSubmitting(false);
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
        {plans.map((plan, idx) => (
          <motion.div
            key={idx}
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
                <span className={`text-sm block ${plan.highlight ? "text-white/60" : "text-[#5A5A40]/60"}`}>/ {plan.duration}</span>
              </div>
            </div>

            <h3 className="text-2xl font-serif font-bold mb-2">{plan.name}</h3>
            <p className={`text-sm mb-8 font-serif italic ${plan.highlight ? "text-white/60" : "text-[#5A5A40]/60"}`}>
              Imperial Access Tier
            </p>

            <ul className="space-y-4 mb-12 flex-1">
              {plan.features.map((feature: string, fIdx: number) => (
                <li key={fIdx} className="flex items-center gap-3 text-sm">
                  <div className={`p-1 rounded-full ${plan.highlight ? "bg-[#5A5A40]/40" : "bg-[#5A5A40]/10"}`}>
                    <Check size={12} className="text-[#5A5A40]" />
                  </div>
                  <span className="font-serif">{feature}</span>
                </li>
              ))}
            </ul>

            {plan.price > 0 && (
              <Button
                onClick={() => handleRazorpayPayment(plan)}
                disabled={submitting}
                className={`w-full py-8 rounded-2xl text-lg font-bold transition-all duration-300 ${
                  plan.highlight 
                    ? "bg-antique-gold hover:bg-saddle-brown text-leather shadow-lg" 
                    : "bg-parchment text-saddle-brown hover:bg-leather/10"
                }`}
              >
                {submitting ? "Preparing Tribute..." : "Commission Now"}
              </Button>
            )}
            
            {plan.price === 0 && (
              <Button
                disabled
                className="w-full py-8 rounded-2xl text-lg font-bold bg-leather/5 text-leather/40"
              >
                Current Plan
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
          <div>
            <h4 className="font-serif font-bold text-lg">Secure Transactions</h4>
            <p className="text-sm text-[#5A5A40]/60 font-serif">All payments are manually verified by the Grand Vizier. Please allow up to 24 hours for activation.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <CreditCard className="text-[#5A5A40]/40" size={24} />
          <span className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/40">Verified UPI Channel</span>
        </div>
      </div>
    </div>
  );
}
