import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, collection, query, where, onSnapshot, addDoc, serverTimestamp, OperationType, handleFirestoreError } from '../lib/firebase';
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
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [newLog, setNewLog] = useState({ subject: 'History', duration: 60 });

  useEffect(() => {
    const path = `users/${user.uid}/studyLogs`;
    const q = query(collection(db, path));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const addLog = async () => {
    const path = `users/${user.uid}/studyLogs`;
    try {
      await addDoc(collection(db, path), {
        ...newLog,
        userId: user.uid,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
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

  const COLORS = ['#5A5A40', '#8E9299', '#1a1a1a', '#D4CFC7', '#4A4A30'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Stats Overview */}
      <div className="lg:col-span-2 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-[#5A5A40]/10 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[#5A5A40]/10 rounded-2xl">
                <Clock className="text-[#5A5A40]" size={24} />
              </div>
              <span className="font-serif font-bold text-[#5A5A40]">Total Hours</span>
            </div>
            <p className="text-4xl font-serif font-bold">{chartData.reduce((a, b) => a + b.hours, 0).toFixed(1)}</p>
            <p className="text-xs text-[#5A5A40]/60 mt-2 uppercase tracking-widest">This Season</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-[#5A5A40]/10 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[#5A5A40]/10 rounded-2xl">
                <Target className="text-[#5A5A40]" size={24} />
              </div>
              <span className="font-serif font-bold text-[#5A5A40]">Syllabus</span>
            </div>
            <p className="text-4xl font-serif font-bold">42%</p>
            <p className="text-xs text-[#5A5A40]/60 mt-2 uppercase tracking-widest">General Studies</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-[#5A5A40]/10 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[#5A5A40]/10 rounded-2xl">
                <CheckCircle2 className="text-[#5A5A40]" size={24} />
              </div>
              <span className="font-serif font-bold text-[#5A5A40]">Streak</span>
            </div>
            <p className="text-4xl font-serif font-bold">12</p>
            <p className="text-xs text-[#5A5A40]/60 mt-2 uppercase tracking-widest">Days Active</p>
          </div>
        </div>

        {/* Effort Chart */}
        <div className="bg-white p-8 rounded-3xl border border-[#5A5A40]/10 shadow-sm">
          <h3 className="font-serif text-xl font-bold mb-8 flex items-center gap-3">
            <BarChart3 size={20} className="text-[#5A5A40]" />
            Subject-wise Effort
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#5A5A4011" />
                <XAxis 
                  dataKey="subject" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#5A5A40', fontSize: 12, fontFamily: 'serif' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#5A5A40', fontSize: 12, fontFamily: 'serif' }}
                />
                <Tooltip 
                  cursor={{ fill: '#5A5A4008' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #5A5A4022',
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
        <div className="bg-white p-8 rounded-3xl border border-[#5A5A40]/10 shadow-sm">
          <h3 className="font-serif text-xl font-bold mb-6">Log Session</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-[#5A5A40]/60 font-bold mb-2 block">Subject</label>
              <select 
                value={newLog.subject}
                onChange={(e) => setNewLog({ ...newLog, subject: e.target.value })}
                className="w-full bg-[#f5f2ed] border-none rounded-xl p-3 font-serif focus:ring-2 focus:ring-[#5A5A40]"
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
              <label className="text-xs uppercase tracking-widest text-[#5A5A40]/60 font-bold mb-2 block">Duration (min)</label>
              <input 
                type="number"
                value={newLog.duration}
                onChange={(e) => setNewLog({ ...newLog, duration: parseInt(e.target.value) })}
                className="w-full bg-[#f5f2ed] border-none rounded-xl p-3 font-serif focus:ring-2 focus:ring-[#5A5A40]"
              />
            </div>
            <Button 
              onClick={addLog}
              className="w-full bg-[#5A5A40] hover:bg-[#4A4A30] text-white rounded-xl py-6 shadow-md"
            >
              <Plus size={18} className="mr-2" />
              Record Entry
            </Button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-[#5A5A40]/10 shadow-sm">
          <h3 className="font-serif text-xl font-bold mb-6">Recent Ledger</h3>
          <div className="space-y-4">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-[#f5f2ed]/50 rounded-2xl border border-[#5A5A40]/5">
                <div>
                  <p className="font-serif font-bold text-sm">{log.subject}</p>
                  <p className="text-[10px] text-[#5A5A40]/60 uppercase tracking-tighter">{log.date}</p>
                </div>
                <span className="text-sm font-serif italic">{log.duration}m</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
