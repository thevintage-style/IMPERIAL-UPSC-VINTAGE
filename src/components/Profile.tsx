import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, doc, getDoc, updateDoc, OperationType, handleFirestoreError } from '../lib/firebase';
import { User as UserIcon, Target, Save, Sparkles, ShieldCheck, UserCircle } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { AvatarSelector } from './AvatarSelector';

interface ProfileProps {
  user: User;
}

export function Profile({ user }: ProfileProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [studyGoal, setStudyGoal] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const uid = user.uid || (user as any).id;
      if (!uid) return;
      const docRef = doc(db, 'users', uid);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStudyGoal(data.studyGoal || '');
          setAvatarId(data.avatarId || '');
          setDisplayName(data.displayName || user.displayName || '');
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, [user.uid, (user as any).id]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    const uid = user.uid || (user as any).id;
    const path = `users/${uid}`;
    const publicPath = `publicProfiles/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        displayName,
        studyGoal,
        avatarId,
        updatedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'publicProfiles', uid), {
        displayName,
        avatarId,
        updatedAt: new Date().toISOString()
      });
      setMessage('Profile updated in the Imperial Archives.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="parchment-card p-12 relative overflow-hidden"
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <ShieldCheck size={200} />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-12 mb-12">
          <div className="relative">
            <img 
              src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              alt="Profile" 
              className="w-32 h-32 rounded-full border-4 border-saddle-brown shadow-xl"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-2 -right-2 bg-antique-gold p-2 rounded-full shadow-lg">
              <Sparkles size={20} className="text-leather" />
            </div>
          </div>
          
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-display font-bold text-leather mb-2">Scholar's Folio</h2>
            <p className="text-saddle-brown font-serif italic">Member of the Imperial Academy since {new Date(user.metadata.creationTime || '').toLocaleDateString()}</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-leather/60">
                <UserIcon size={14} />
                Display Name
              </label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-parchment/50 border-2 border-saddle-brown/20 rounded-xl p-4 font-serif focus:border-saddle-brown outline-none transition-all"
                placeholder="Enter your name..."
              />
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-leather/60">
                <Target size={14} />
                Study Goal
              </label>
              <input 
                type="text"
                value={studyGoal}
                onChange={(e) => setStudyGoal(e.target.value)}
                className="w-full bg-parchment/50 border-2 border-saddle-brown/20 rounded-xl p-4 font-serif focus:border-saddle-brown outline-none transition-all"
                placeholder="e.g., Rank 1 in CSE 2026"
              />
            </div>
          </div>

          <div className="space-y-6">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-leather/60">
              <UserCircle size={14} />
              Officer Avatar & Uniform
            </label>
            <AvatarSelector 
              currentAvatarId={avatarId} 
              onSelect={setAvatarId} 
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            <p className={`text-sm font-serif italic text-green-700 transition-opacity duration-500 ${message ? 'opacity-100' : 'opacity-0'}`}>
              {message}
            </p>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-saddle-brown hover:bg-leather text-parchment px-8 py-6 rounded-xl shadow-lg flex items-center gap-3 transition-all transform hover:scale-105"
            >
              <Save size={20} />
              {isSaving ? 'Archiving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 pt-8 border-t border-saddle-brown/10 text-center">
          <p className="text-xs text-leather/40 font-serif italic">
            "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice."
          </p>
        </div>
      </motion.div>
    </div>
  );
}
