import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Clock, Target, CheckCircle2, Plus, BarChart3, Sparkles, Zap } from 'lucide-react';
import { Button } from './ui/button';

interface DashboardProps {
  user: FirebaseUser | SupabaseUser;
}

export function Dashboard({ user }: DashboardProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [newLog, setNewLog] = useState({ subject: 'History', duration: 60 });
  const [isLoading, setIsLoading] = useState(true);
  const [isImperial, setIsImperial] = useState(false);
  const [usageCount, setUsageCount] = useState(0); 

  const userId = (user as any).uid || (user as any).id;
  const PAYMENT_LINK = "https://www.instamojo.com/@Imperialvintage05"

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setIsLoading(true);
      const { data: profile } = await supabase.from('profiles').select('plan_type').eq('id', userId).single();
      if (profile?.plan_type === 'imperial') setIsImperial(true);
      const { data: logData } = await supabase.from('study_logs').select('*').eq('user_id', userId);
      setLogs(logData || []);
      setIsLoading(false);
    };
    fetchData();
  }, [userId]);

  const handleOracleClick = () => {
    if (!isImperial && usageCount >= 3) {
      alert("🚀 Free limit reached! Upgrade to Imperial for unlimited Oracle AI access.");
      window.open(PAYMENT_LINK, '_blank');
    } else {
      alert(`Opening Oracle AI... (${isImperial ? 'Unlimited Access' : (3 - usageCount) + ' free uses left'})`);
      if (!isImperial) setUsageCount(usageCount + 1);
    }
  };

  const addLog = async () => {
    if (!userId) return;
    await supabase.from('study_logs').insert([{ ...newLog, user_id: userId, date: new Date().toISOString().split('T')[0] }]);
  };

  const chartData = logs.reduce((acc: any[], log) => {
    const existing = acc.find(a => a.subject === log.subject);
    if (existing) { existing.hours += log.duration / 60; } 
    else { acc.push({ subject: log.subject, hours: log.duration / 60 }); }
    return acc;
  }, []);

  const COLORS = ['#8B4513', '#D4AF37', '#1A1612'];

  return (
    <div className="space-y-8">
      {/* Oracle AI Section - NO TEST SERIES MENTIONED */}
      <div 
        onClick={handleOracleClick}
        className="cursor-pointer group relative overflow-hidden bg-gradient-to-r from-[#1A1612] to-[#3D2B1F] p-8 rounded-3xl border border-[#D4AF37]/30 shadow-2xl transition-all"
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Sparkles className="text-[#D4AF37]" size={20} />
              <span className="text-[#D4AF37] font-serif text-xs font-bold uppercase tracking-[0.2em]">Imperial Oracle AI</span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-white mb-2">Ask the Oracle</h2>
            <p className="text-white/60">Expert UPSC analysis. {isImperial ? "Unlimited Access." : "Try it for free."}</p>
          </div>
          
          <div className="flex flex-col items-center gap-3">
            {!isImperial && (
              <div className="px-4 py-1 bg-white/10 rounded-full border border-white/20 text-white text-xs">
                {3 - usageCount > 0 ? `${3 - usageCount} Free Uses Left` : "Limit Reached"}
              </div>
            )}
            <button className="px-8 py-3 bg-[#D4AF37] text-[#1A1612] rounded-xl font-bold">
              {isImperial ? "Launch AI" : (usageCount >= 3 ? "Upgrade Now" : "Try for Free")}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-[#8B4513]/10 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <Clock className="text-[#8B4513]" size={24} />
                <span className="font-serif font-bold text-[#8B4513]">Study Hours</span>
              </div>
              <p className="text-4xl font-serif font-bold">{chartData.reduce((a, b) => a + b.hours, 0).toFixed(1)}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-[#8B4513]/10 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <Target className="text-[#8B4513]" size={24} />
                <span className="font-serif font-bold text-[#8B4513]">Syllabus</span>
              </div>
              <p className="text-4xl font-serif font-bold">42%</p>
            </div>
            
            {!isImperial && (
              <div 
                onClick={() => window.open(PAYMENT_LINK, '_blank')}
                className="cursor-pointer bg-amber-50 p-6 rounded-3xl border-2 border-dashed border-amber-200 flex flex-col items-center justify-center hover:bg-amber-100 transition-colors"
              >
                <Zap className="text-amber-600 mb-1" size={20} />
                <span className="font-bold text-amber-900 text-sm italic">Get Imperial</span>
                <p className="text-[10px] text-amber-800 text-center">Unlimited Oracle AI for ₹99</p>
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#8B4513]/10 shadow-sm h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8B451311" />
                  <XAxis dataKey="subject" tick={{ fill: '#8B4513', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#8B4513', fontSize: 12 }} />
                  <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                    {chartData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-[#8B4513]/10 shadow-sm">
          <h3 className="font-serif text-xl font-bold mb-6 text-[#1A1612]">Log Session</h3>
          <div className="space-y-4">
            <select 
              value={newLog.subject} 
              onChange={(e) => setNewLog({ ...newLog, subject: e.target.value })}
              className="w-full bg-[#F5F2E7] border-none rounded-xl p-3"
            >
              <option>History</option><option>Geography</option><option>Polity</option>
            </select>
            <Button onClick={addLog} className="w-full bg-[#8B4513] text-[#F5F2E7] rounded-xl py-6">
              Record Entry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
