import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function Success() {
  useEffect(() => {
    const updateProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Calculate expiry date: Today + 30 days
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        await supabase
          .from('user_profiles')
          .update({ 
            plan_type: 'Imperial', 
            subscription_expires_at: expiryDate.toISOString() 
          })
          .eq('id', user.id);
        
        // Redirect to dashboard after update
        setTimeout(() => window.location.href = '/dashboard', 2000);
      }
    };
    updateProfile();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFBF7]">
      <h1 className="text-3xl font-serif text-[#8B4513]">Payment Received!</h1>
      <p className="text-gray-600">Unlocking the Imperial Archives for you...</p>
    </div>
  );
}