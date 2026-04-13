import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, ShieldAlert, Send } from 'lucide-react';
import { Button } from './ui/button';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reporterId: string;
  reportedId: string;
  reportedName: string;
  context?: string;
}

export function ReportModal({ isOpen, onClose, reporterId, reportedId, reportedName, context }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId,
        reportedId,
        reportedName,
        reason,
        details,
        context,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert("The Imperial Censors have received your report. We shall investigate this breach of conduct with utmost priority.");
      onClose();
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("The Imperial conduits are congested. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-leather/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-parchment w-full max-w-md rounded-3xl border-4 border-saddle-brown shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-red-600">
                  <AlertTriangle size={24} />
                  <h3 className="text-xl font-serif font-bold">Report Scholar</h3>
                </div>
                <button onClick={onClose} className="text-saddle-brown/40 hover:text-saddle-brown">
                  <X size={24} />
                </button>
              </div>

              <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                <p className="text-xs text-red-800 font-serif italic">
                  Reporting <strong>{reportedName}</strong> for a breach of the Imperial Code of Conduct.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-saddle-brown/60">Reason for Report</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-white border-2 border-saddle-brown/10 rounded-xl py-3 px-4 font-serif text-sm outline-none focus:border-antique-gold"
                  >
                    <option value="">Select a reason...</option>
                    <option value="spam">Spam / Unrelated Content</option>
                    <option value="harassment">Harassment / Abusive Language</option>
                    <option value="misinformation">Misinformation</option>
                    <option value="inappropriate">Inappropriate Profile/Media</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-saddle-brown/60">Additional Details</label>
                  <textarea
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Provide context for the Imperial Censors..."
                    className="w-full bg-white border-2 border-saddle-brown/10 rounded-xl py-3 px-4 font-serif text-sm outline-none focus:border-antique-gold resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="flex-1 rounded-xl border-2 border-saddle-brown/10 text-saddle-brown"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!reason || isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center gap-2"
                >
                  {isSubmitting ? "Dispatching..." : (
                    <>
                      <ShieldAlert size={18} />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
