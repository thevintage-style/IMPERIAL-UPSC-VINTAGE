import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Send, 
  Pin, 
  Trash2, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  ShieldAlert,
  MessageSquare,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { ReportModal } from './ReportModal';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  isPinned?: boolean;
  reactions?: Record<string, number>;
  replyToId?: string;
  createdAt: any;
  type: 'text' | 'pdf' | 'video';
}

interface CommunityProps {
  user: User;
  isAdmin: boolean;
}

export function Community({ user, isAdmin }: CommunityProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [reportingMsg, setReportingMsg] = useState<Message | null>(null);
  const [view, setView] = useState<'chat' | 'dashboard'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'communityMessages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filterMessage = async (text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.VINTAGE_ORACLE_KEY || "" });
      const aiResult = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: `
          Analyze the following message for a UPSC study community. 
          If the message is related to UPSC, studies, current affairs, or general academic motivation, return "SAFE".
          If it is spam, offensive, or completely unrelated to studies, return "UNSAFE".
          
          Message: "${text}"
        ` }] }]
      });
      return (aiResult.text || "").trim().toUpperCase().includes("SAFE");
    } catch (error) {
      console.error("AI Filter Error:", error);
      return true; // Default to safe if AI fails
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isFiltering) return;

    setIsFiltering(true);
    const isSafe = await filterMessage(inputText);
    
    if (!isSafe) {
      alert("The Imperial Censors have flagged this message as unrelated to UPSC studies. Please maintain scholarly focus.");
      setIsFiltering(false);
      return;
    }

    try {
      await addDoc(collection(db, 'communityMessages'), {
        text: inputText,
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous Scholar',
        senderPhoto: user.photoURL,
        type: 'text',
        createdAt: serverTimestamp(),
        reactions: {}
      });
      setInputText('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsFiltering(false);
    }
  };

  const handlePinMessage = async (msgId: string, currentPinned: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'communityMessages', msgId), {
        isPinned: !currentPinned
      });
    } catch (error) {
      console.error("Error pinning message:", error);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'communityMessages', msgId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const newReactions = { ...(msg.reactions || {}) };
    newReactions[emoji] = (newReactions[emoji] || 0) + 1;

    try {
      await updateDoc(doc(db, 'communityMessages', msgId), {
        reactions: newReactions
      });
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const pinnedMessages = messages.filter(m => m.isPinned);

  return (
    <div className="h-full flex flex-col bg-parchment/50 rounded-3xl border-2 border-saddle-brown/20 overflow-hidden shadow-inner">
      {/* View Toggle */}
      <div className="flex bg-white border-b border-saddle-brown/10 p-2">
        <button 
          onClick={() => setView('chat')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'chat' ? 'bg-saddle-brown text-parchment shadow-md' : 'text-saddle-brown/40 hover:text-saddle-brown'}`}
        >
          Imperial Chat
        </button>
        <button 
          onClick={() => setView('dashboard')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-saddle-brown text-parchment shadow-md' : 'text-saddle-brown/40 hover:text-saddle-brown'}`}
        >
          Community Dashboard
        </button>
      </div>

      {view === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-saddle-brown/10 shadow-sm text-center">
              <MessageSquare className="mx-auto text-saddle-brown mb-2" size={32} />
              <p className="text-2xl font-serif font-bold text-leather">{messages.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-saddle-brown/40">Total Proclamations</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-saddle-brown/10 shadow-sm text-center">
              <Sparkles className="mx-auto text-antique-gold mb-2" size={32} />
              <p className="text-2xl font-serif font-bold text-leather">{new Set(messages.map(m => m.senderId)).size}</p>
              <p className="text-[10px] uppercase tracking-widest text-saddle-brown/40">Active Scholars</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-saddle-brown/10 shadow-sm text-center">
              <Pin className="mx-auto text-saddle-brown/60 mb-2 rotate-45" size={32} />
              <p className="text-2xl font-serif font-bold text-leather">{messages.filter(m => m.isPinned).length}</p>
              <p className="text-[10px] uppercase tracking-widest text-saddle-brown/40">Pinned Decrees</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-saddle-brown/10 shadow-lg">
            <h4 className="font-serif font-bold text-xl text-leather mb-6 flex items-center gap-2">
              <ShieldAlert size={20} className="text-antique-gold" />
              Trending Scholarly Topics
            </h4>
            <div className="flex flex-wrap gap-3">
              {['#UPSC2026', '#EthicsGS4', '#PolityReforms', '#EconomyAnalysis', '#IRTrends', '#HistoryOptional'].map(tag => (
                <span key={tag} className="px-4 py-2 bg-parchment/50 border border-saddle-brown/10 rounded-full text-xs font-serif italic text-saddle-brown hover:bg-antique-gold/10 transition-colors cursor-pointer">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-leather text-parchment p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-serif text-2xl font-bold mb-2">The Imperial Code of Conduct</h4>
              <p className="text-sm font-serif italic opacity-70 mb-6">"Scholars shall maintain the highest level of decorum and focus on the pursuit of administrative excellence."</p>
              <ul className="space-y-2 text-xs font-serif opacity-90">
                <li>• No spam or unrelated content.</li>
                <li>• Respect fellow aspirants.</li>
                <li>• Share verified intelligence only.</li>
              </ul>
            </div>
            <Sparkles className="absolute -right-10 -bottom-10 w-48 h-48 text-parchment/5 rotate-12" />
          </div>
        </div>
      ) : (
        <>
          {/* Pinned Messages Header */}
      <AnimatePresence>
        {pinnedMessages.length > 0 && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="bg-antique-gold/10 border-b border-saddle-brown/10 p-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-saddle-brown uppercase tracking-widest mb-2">
              <Pin size={14} className="rotate-45" />
              Pinned Proclamations
            </div>
            <div className="space-y-2">
              {pinnedMessages.map(msg => (
                <div key={msg.id} className="text-sm italic text-leather/80 flex justify-between items-center bg-white/40 p-2 rounded-lg border border-saddle-brown/5">
                  <span className="truncate">"{msg.text}"</span>
                  {isAdmin && (
                    <button onClick={() => handlePinMessage(msg.id, true)} className="text-saddle-brown/40 hover:text-saddle-brown">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
      >
        {messages.map((msg, idx) => {
          const isOwn = msg.senderId === user.uid;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter text-saddle-brown/60 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <span>{msg.senderName}</span>
                  {msg.isPinned && <Pin size={10} className="text-antique-gold rotate-45" />}
                </div>
                
                <div className={`relative group p-4 rounded-2xl shadow-sm border ${
                  isOwn 
                    ? 'bg-leather text-parchment border-saddle-brown/20 rounded-tr-none' 
                    : 'bg-white text-leather border-saddle-brown/10 rounded-tl-none'
                }`}>
                  <p className="text-sm font-serif leading-relaxed">{msg.text}</p>
                  
                  {/* Reactions Display */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="absolute -bottom-3 right-2 flex gap-1">
                      {Object.entries(msg.reactions).map(([emoji, count]) => (
                        <span key={emoji} className="bg-white border border-saddle-brown/10 rounded-full px-1.5 py-0.5 text-[10px] shadow-sm flex items-center gap-1">
                          {emoji} <span className="font-bold text-saddle-brown/60">{count}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions Overlay */}
                  <div className={`absolute top-0 ${isOwn ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
                    <button 
                      onClick={() => handleReaction(msg.id, '👍')}
                      className="p-1.5 bg-white border border-saddle-brown/10 rounded-full hover:bg-parchment transition-colors text-xs"
                    >
                      👍
                    </button>
                    <button 
                      onClick={() => handleReaction(msg.id, '❤️')}
                      className="p-1.5 bg-white border border-saddle-brown/10 rounded-full hover:bg-parchment transition-colors text-xs"
                    >
                      ❤️
                    </button>
                    {!isOwn && (
                      <button 
                        onClick={() => setReportingMsg(msg)}
                        className="p-1.5 bg-white border border-saddle-brown/10 rounded-full hover:bg-orange-50 transition-colors text-orange-400"
                      >
                        <AlertTriangle size={12} />
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => handlePinMessage(msg.id, !!msg.isPinned)}
                          className={`p-1.5 bg-white border border-saddle-brown/10 rounded-full hover:bg-parchment transition-colors ${msg.isPinned ? 'text-antique-gold' : 'text-saddle-brown/40'}`}
                        >
                          <Pin size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1.5 bg-white border border-saddle-brown/10 rounded-full hover:bg-parchment transition-colors text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-saddle-brown/10">
        <div className="relative flex items-center gap-3">
          <div className="flex-1 relative">
            <input 
              type="text"
              placeholder={isFiltering ? "The Imperial Censors are reviewing..." : "Share a scholarly thought..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isFiltering}
              className="w-full bg-parchment/30 border-2 border-saddle-brown/10 rounded-2xl py-4 pl-6 pr-14 font-serif text-sm focus:border-antique-gold outline-none transition-all disabled:opacity-50"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button className="text-saddle-brown/40 hover:text-saddle-brown transition-colors">
                <Smile size={20} />
              </button>
              <button className="text-saddle-brown/40 hover:text-saddle-brown transition-colors">
                <Paperclip size={20} />
              </button>
            </div>
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isFiltering}
            className="bg-saddle-brown hover:bg-leather text-parchment rounded-2xl px-6 h-[56px] shadow-lg flex items-center gap-2"
          >
            {isFiltering ? (
              <Sparkles size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-center mt-3 text-saddle-brown/40 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          <ShieldAlert size={10} />
          All proclamations are monitored by the Imperial Censors
        </p>
      </div>
        </>
      )}

      <ReportModal
        isOpen={!!reportingMsg}
        onClose={() => setReportingMsg(null)}
        reporterId={user.uid}
        reportedId={reportingMsg?.senderId || ''}
        reportedName={reportingMsg?.senderName || ''}
        context={`Community Message: ${reportingMsg?.text}`}
      />
    </div>
  );
}
