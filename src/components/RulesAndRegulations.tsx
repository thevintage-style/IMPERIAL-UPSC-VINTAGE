import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User as UserIcon,
  AlertTriangle,
  FileText,
  Gavel,
  Pin,
  Trash2
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reportedName: string;
  reason: string;
  details: string;
  context?: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: any;
}

interface RulesAndRegulationsProps {
  user: User;
}

export function RulesAndRegulations({ user }: RulesAndRegulationsProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
    });
    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (reportId: string, status: Report['status']) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
    } catch (error) {
      console.error("Error updating report status:", error);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (confirm("Are you sure you want to expunge this report from the Imperial Records?")) {
      try {
        await deleteDoc(doc(db, 'reports', reportId));
      } catch (error) {
        console.error("Error deleting report:", error);
      }
    }
  };

  const filteredReports = reports.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'pending') return r.status === 'pending' || r.status === 'investigating';
    return r.status === 'resolved' || r.status === 'dismissed';
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg">
            <Gavel size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold text-saddle-brown">Imperial Regulation Vault</h2>
            <p className="text-sm font-serif italic text-saddle-brown/60">Monitoring the conduct of scholars across the Empire.</p>
          </div>
        </div>
        
        <div className="flex bg-white border-2 border-saddle-brown/10 rounded-2xl p-1">
          {(['all', 'pending', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                filter === f 
                  ? 'bg-saddle-brown text-parchment shadow-md' 
                  : 'text-saddle-brown/40 hover:text-saddle-brown'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredReports.map((report) => (
            <motion.div
              key={report.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border-2 border-saddle-brown/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      report.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                      report.status === 'investigating' ? 'bg-blue-100 text-blue-600' :
                      report.status === 'resolved' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <ShieldAlert size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-serif font-bold text-leather">Report against {report.reportedName}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${
                          report.status === 'pending' ? 'border-orange-200 text-orange-600 bg-orange-50' :
                          report.status === 'investigating' ? 'border-blue-200 text-blue-600 bg-blue-50' :
                          report.status === 'resolved' ? 'border-green-200 text-green-600 bg-green-50' :
                          'border-gray-200 text-gray-600 bg-gray-50'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-saddle-brown/40 font-bold mt-1">
                        <Clock size={10} />
                        {report.createdAt?.toDate().toLocaleString() || 'Recently'}
                        <span className="mx-1">•</span>
                        <AlertTriangle size={10} />
                        Reason: {report.reason}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {report.status !== 'resolved' && (
                      <button 
                        onClick={() => handleStatusChange(report.id, 'resolved')}
                        className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                        title="Mark as Resolved"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    {report.status !== 'investigating' && report.status !== 'resolved' && (
                      <button 
                        onClick={() => handleStatusChange(report.id, 'investigating')}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                        title="Start Investigation"
                      >
                        <Clock size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleStatusChange(report.id, 'dismissed')}
                      className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                      title="Dismiss Report"
                    >
                      <XCircle size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteReport(report.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-parchment/30 p-4 rounded-2xl border border-saddle-brown/5">
                      <p className="text-[10px] font-bold text-saddle-brown/40 uppercase tracking-widest mb-2">Details from Reporter</p>
                      <p className="text-sm font-serif text-leather/80 leading-relaxed italic">
                        "{report.details || 'No additional details provided.'}"
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {report.context && (
                      <div className="bg-antique-gold/5 p-4 rounded-2xl border border-antique-gold/10">
                        <p className="text-[10px] font-bold text-antique-gold uppercase tracking-widest mb-2">Evidence Context</p>
                        <p className="text-sm font-serif text-leather/80 leading-relaxed">
                          {report.context}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredReports.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-saddle-brown/10">
            <div className="w-16 h-16 bg-parchment rounded-full flex items-center justify-center mx-auto mb-4 text-saddle-brown/20">
              <ShieldAlert size={32} />
            </div>
            <h3 className="font-serif text-xl font-bold text-saddle-brown/40">The Archives are Clean</h3>
            <p className="text-sm font-serif italic text-saddle-brown/20">No reports match your current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
