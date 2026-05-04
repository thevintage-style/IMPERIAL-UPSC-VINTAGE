import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Book, Clock, Target, CheckCircle2, Plus, BarChart3 } from 'lucide-react';
import { Button } from './ui/button';

interface DashboardProps {
  user: FirebaseUser | SupabaseUser;
}

export function Dashboard({ user }: DashboardProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [newLog, setNewLog] = useState({ subject: 'History', duration: 60 });
  const [isLoading, setIsLoading] = useState(true);

  const userId = (user as any).uid || (user as any).id;

  useEffect(() => {
    if (!userId) return;

    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('study_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        console.error("Error fetching study logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();

    const subscription = supabase
      .channel('study_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_logs', filter: `user_id=eq.${userId}` }, fetchLogs)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  const addLog = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('study_logs')
        .insert([{
          ...newLog,
          user_id: userId,
          date: new Date().toISOString().split('T')[0]
        }]);
      if (error) throw error;
    } catch (error) {
      console.error("Error adding study log:", error);
    }
  };

  const chartData = logs.reduce((acc: any[], log) => {
    const existing = acc.find(a => a.subject === log.subject);
    if (existing) {
      existing.hours += log.duration / 60;
    } else {
      acc.push({ subject: log.subject, hours: log.duration / 60 });
    }
    return acc;
  }, []);

  const COLORS = ['#8B4513', '#D4AF37', '#1A1612', '#5A5A40', '#4A4A30'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Stats Overview */}
      <div className="lg:col-span-2 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-[#8B4513]/10 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[#8B4513]/10 rounded-2xl">
                <Clock className="text-[#8B4513]" size={24} />
              </div>
              <span className="font-serif font-bold text-[#8B4513]">Total Hours</span>
            </div>
            <p className="text-4xl font-serif font-bold">{chartData.reduce((a, b) => a + b.hours, 0).toFixed(1)}</p>
            <p className="text-xs text-[#8B4513]/60 mt-2 uppercase tracking-widest">This Season</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-[#8B4513]/10 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[#8B4513]/10 rounded-2xl">
                <Target className="text-[#8B4513]" size={24} />
              </div>
              <span className="font-serif font-bold text-[#8B4513]">Syllabus</span>
            </div>
            <p className="text-4xl font-serif font-bold">42%</p>
            <p className="text-xs text-[#8B4513]/60 mt-2 uppercase tracking-widest">General Studies</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-[#8B4513]/10 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[#8B4513]/10 rounded-2xl">
                <CheckCircle2 className="text-[#8B4513]" size={24} />
              </div>
              <span className="font-serif font-bold text-[#8B4513]">Streak</span>
            </div>
            <p className="text-4xl font-serif font-bold">12</p>
            <p className="text-xs text-[#8B4513]/60 mt-2 uppercase tracking-widest">Days Active</p>
          </div>
        </div>

        {/* Effort Chart */}
        <div className="bg-white p-8 rounded-3xl border border-[#8B4513]/10 shadow-sm">
          <h3 className="font-serif text-xl font-bold mb-8 flex items-center gap-3">
            <BarChart3 size={20} className="text-[#8B4513]" />
            Subject-wise Effort
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8B451311" />
                <XAxis 
                  dataKey="subject" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8B4513', fontSize: 12, fontFamily: 'serif' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8B4513', fontSize: 12, fontFamily: 'serif' }}
                />
                <Tooltip 
                  cursor={{ fill: '#8B451308' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #8B451322',
                    fontFamily: 'serif',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}
                />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sidebar: Add Log & Recent */}
      <div className="space-y-8">
        <div className="bg-white p-8 rounded-3xl border border-[#8B4513]/10 shadow-sm">
          <h3 className="font-serif text-xl font-bold mb-6">Log Session</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-[#8B4513]/60 font-bold mb-2 block">Subject</label>
              <select 
                value={newLog.subject}
                onChange={(e) => setNewLog({ ...newLog, subject: e.target.value })}
                className="w-full bg-[#F5F2E7] border-none rounded-xl p-3 font-serif focus:ring-2 focus:ring-[#8B4513]"
              >
                <option>History</option>
                <option>Geography</option>
                <option>Polity</option>
                <option>Economics</option>
                <option>Ethics</option>
                <option>Current Affairs</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-[#8B4513]/60 font-bold mb-2 block">Duration (min)</label>
              <input 
                type="number"
                value={newLog.duration}
                onChange={(e) => setNewLog({ ...newLog, duration: parseInt(e.target.value) })}
                className="w-full bg-[#F5F2E7] border-none rounded-xl p-3 font-serif focus:ring-2 focus:ring-[#8B4513]"
              />
            </div>
            <Button 
              onClick={addLog}
              className="w-full bg-[#8B4513] hover:bg-[#1A1612] text-[#F5F2E7] rounded-xl py-6 shadow-md"
            >
              <Plus size={18} className="mr-2" />
              Record Entry
            </Button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-[#8B4513]/10 shadow-sm">
          <h3 className="font-serif text-xl font-bold mb-6">Recent Ledger</h3>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4 text-xs text-[#8B4513]/40">Loading ledger...</div>
            ) : (
              logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-[#F5F2E7]/50 rounded-2xl border border-[#8B4513]/5">
                  <div>
                    <p className="font-serif font-bold text-sm">{log.subject}</p>
                    <p className="text-[10px] text-[#8B4513]/60 uppercase tracking-tighter">{log.date}</p>
                  </div>
                  <span className="text-sm font-serif italic">{log.duration}m</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Book, Clock, Target, CheckCircle2, Plus, BarChart3, Lock, Sparkles, Trophy } from 'lucide-react';
import { Button } from './ui/button';

interface DashboardProps {
  user: FirebaseUser | SupabaseUser;
}

export function Dashboard({ user }: DashboardProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [newLog, setNewLog] = useState({ subject: 'History', duration: 60 });
  const [isLoading, setIsLoading] = useState(true);
  const [isImperial, setIsImperial] = useState(false); // NEW: Membership State

  const userId = (user as any).uid || (user as any).id;
  const PAYMENT_LINK = "https://www.instamojo.com/@Imperialvintage05"
  
  useEffect(() => {
    if (!userId) return;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Study Logs
        const { data: logData, error: logError } = await supabase
          .from('study_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (logError) throw logError;
        setLogs(logData || []);

        // 2. NEW: Check Membership Status
        const { data: profileData } = await supabase
          .from('profiles')
          .select('plan_type')
          .eq('id', userId)
          .single();
        
        if (profileData?.plan_type === 'imperial') {
          setIsImperial(true);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [userId]);

  const handlePremiumFeature = (featureName: string) => {
    if (!isImperial) {
      alert(`🔒 The ${featureName} is an Imperial Member exclusive.`);
      window.open(PAYMENT_LINK, '_blank');
    } else {
      alert(`Opening ${featureName}... Welcome, Imperial Member!`);
      // Add navigation to your AI or Test page here
    }
  };

  const addLog = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('study_logs')
        .insert([{
          ...newLog,
          user_id: userId,
          date: new Date().toISOString().split('T')[0]
        }]);
      if (error) throw error;
    } catch (error) {
      console.error("Error adding study log:", error);
    }
  };

  const chartData = logs.reduce((acc: any[], log) => {
    const existing = acc.find(a => a.subject === log.subject);
    if (existing) {
      existing.hours += log.duration / 60;
    } else {
      acc.push({ subject: log.subject, hours: log.duration / 60 });
    }
    return acc;
  }, []);

  const COLORS = ['#8B4513', '#D4AF37', '#1A1612', '#5A5A40', '#4A4A30'];

  return (
    <div className="space-y-8">
      
      {/* NEW: Imperial Premium Vault Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          onClick={() => handlePremiumFeature('Oracle AI')}
          className="cursor-pointer group relative overflow-hidden bg-gradient-to-br from-[#1A1612] to-[#3D2B1F] p-6 rounded-3xl border border-[#D4AF37]/30 shadow-xl"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-[#D4AF37]" size={20} />
                <span className="text-[#D4AF37] font-serif text-sm font-bold uppercase tracking-widest">Imperial Exclusive</span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-white mb-2">Oracle AI</h2>
              <p className="text-white/60 text-sm">Instant UPSC Analysis & Answer Evaluation</p>
            </div>
            {!isImperial && <Lock className="text-[#D4AF37]/50" size={24} />}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[#D4AF37] font-bold text-sm group-hover:gap-4 transition-all">
            {isImperial ? "Enter Vault →" : "Unlock for ₹99 →"}
          </div>
        </div>

        <div 
          onClick={() => handlePremiumFeature('Imperial Test Series')}
          className="cursor-pointer group relative overflow-hidden bg-white p-6 rounded-3xl border border-[#8B4513]/10 shadow-sm hover:border-[#D4AF37]/50 transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-[#8B4513]" size={20} />
                <span className="text-[#8B4513]/60 font-serif text-sm font-bold uppercase tracking-widest">Premium Content</span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">Test Series</h2>
              <p className="text-slate-500 text-sm">Full Length Mocks & Daily Practice</p>
            </div>
            {!isImperial && <Lock className="text-slate-300" size={24} />}
          </div>
          <div className="mt-4 text-[#8B4513] font-bold text-sm">
            {isImperial ? "Begin Exam →" : "Join Imperial to Access →"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats Overview */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-[#8B4513]/10 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-[#8B4513]/10 rounded-2xl">
                  <Clock className="text-[#8B4513]" size={24} />
                </div>
                <span className="font-serif font-bold text-[#8B4513]">Total Hours</span>
              </div>
              <p className="text-4xl font-serif font-bold">{chartData.reduce((a, b) => a + b.hours, 0).toFixed(1)}</p>
              <p className="text-xs text-[#8B4513]/60 mt-2 uppercase tracking-widest">This Season</p>
            </div>
            {/* ... keeping your existing stats ... */}
            <div className="bg-white p-6 rounded-3xl border border-[#8B4513]/10 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-[#8B4513]/10 rounded-2xl">
                  <Target className="text-[#8B4513]" size={24} />
                </div>
                <span className="font-serif font-bold text-[#8B4513]">Syllabus</span>
              </div>
              <p className="text-4xl font-serif font-bold">42%</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-[#8B4513]/10 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-[#8B4513]/10 rounded-2xl">
                  <CheckCircle2 className="text-[#8B4513]" size={24} />
                </div>
                <span className="font-serif font-bold text-[#8B4513]">Streak</span>
              </div>
              <p className="text-4xl font-serif font-bold">12</p>
            </div>
          </div>

          {/* Effort Chart */}
          <div className="bg-white p-8 rounded-3xl border border-[#8B4513]/10 shadow-sm">
            <h3 className="font-serif text-xl font-bold mb-8 flex items-center gap-3">
              <BarChart3 size={20} className="text-[#8B4513]" />
              Subject-wise Effort
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8B451311" />
                  <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#8B4513', fontSize: 12, fontFamily: 'serif' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8B4513', fontSize: 12, fontFamily: 'serif' }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #8B451322', fontFamily: 'serif' }} />
                  <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar: Add Log & Recent */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-[#8B4513]/10 shadow-sm">
            <h3 className="font-serif text-xl font-bold mb-6">Log Session</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-[#8B4513]/60 font-bold mb-2 block">Subject</label>
                <select 
                  value={newLog.subject}
                  onChange={(e) => setNewLog({ ...newLog, subject: e.target.value })}
                  className="w-full bg-[#F5F2E7] border-none rounded-xl p-3 font-serif"
                >
                  <option>History</option>
                  <option>Geography</option>
                  <option>Polity</option>
                  <option>Economics</option>
                  <option>Ethics</option>
                  <option>Current Affairs</option>
                </select>
              </div>
              <Button onClick={addLog} className="w-full bg-[#8B4513] text-[#F5F2E7] rounded-xl py-6">
                Record Entry
              </Button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#8B4513]/10 shadow-sm">
            <h3 className="font-serif text-xl font-bold mb-6">Recent Ledger</h3>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4 text-xs text-[#8B4513]/40">Verifying Membership...</div>
              ) : (
                logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-[#F5F2E7]/50 rounded-2xl border border-[#8B4513]/5">
                    <div>
                      <p className="font-serif font-bold text-sm">{log.subject}</p>
                      <p className="text-[10px] text-[#8B4513]/60 uppercase tracking-tighter">{log.date}</p>
                    </div>
                    <span className="text-sm font-serif italic">{log.duration}m</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
