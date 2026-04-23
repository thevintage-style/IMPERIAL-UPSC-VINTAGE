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

interface Comment {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
}

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
  type: 'text' | 'pdf' | 'link';
  comments?: Comment[];
  channel?: 'general' | 'highlights';
}

interface CommunityProps {
  user: User;
  isAdmin: boolean;
}

const CommentSection = ({ msgId, channel }: { msgId: string, channel?: string }) => {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, `communityMessages/${msgId}/comments`),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    }, (error) => {
      console.error("Comments Listener Error:", error);
    });
  }, [msgId]);

  if (comments.length === 0) return null;

  return (
    <div className="mt-4 pl-4 border-l-2 border-[#B2AC88]/20 space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="bg-[#F5F2E7]/30 p-3 rounded-xl border border-[#B2AC88]/10 text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-[#8B4513]">{comment.senderName}</span>
            <span className="text-[8px] opacity-40 italic">
              {comment.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
            </span>
          </div>
          <p className="text-leather/80 leading-relaxed">{comment.text}</p>
        </div>
      ))}
    </div>
  );
};

export function Community({ user, isAdmin }: CommunityProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [reportingMsg, setReportingMsg] = useState<Message | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [view, setView] = useState<'chat' | 'square' | 'dashboard'>('chat');
  const [activeChannel, setActiveChannel] = useState<'general' | 'highlights'>('general');
  const scrollRef = useRef<HTMLDivElement>(null);

  const adminChatId = "ADMIN_HUB";

  useEffect(() => {
    if (!user?.uid || !db) return;
    const q = query(
      collection(db, 'communityMessages'),
      where('channel', '==', activeChannel),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    // Fallback for older messages without channel field
    const qLegacy = activeChannel === 'general' ? query(
      collection(db, 'communityMessages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    ) : null;

    const unsubscribe = onSnapshot(activeChannel === 'highlights' ? q : qLegacy || q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((m: any) => !m.channel || m.channel === activeChannel) as Message[];
      setMessages(msgs);
    }, (error) => {
      console.error("Community Messages Listener Error:", error);
    });

    return () => unsubscribe();
  }, [activeChannel]);

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
        reactions: {},
        channel: activeChannel
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

  const handleReply = async (msgId: string) => {
    if (!replyText.trim()) return;

    try {
      await addDoc(collection(db, `communityMessages/${msgId}/comments`), {
        text: replyText,
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous Scholar',
        createdAt: serverTimestamp()
      });
      setReplyText('');
      setActiveReplyId(null);
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };

  const pinnedMessages = messages.filter(m => m.isPinned);

  return (
    <div className="h-full flex flex-col bg-parchment/50 rounded-3xl border-2 border-saddle-brown/20 overflow-hidden shadow-inner">
      {/* View Toggle */}
      <div className="flex bg-white border-b border-leather/10 p-2 gap-2">
        <div className="flex flex-1 gap-1">
          <button 
            onClick={() => setView('chat')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'chat' ? 'bg-leather text-parchment shadow-md' : 'text-leather/40 hover:text-leather'}`}
          >
            Imperial Chat
          </button>
          <button 
            onClick={() => setView('square')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'square' ? 'bg-leather text-parchment shadow-md' : 'text-leather/40 hover:text-leather'}`}
          >
            Community Square
          </button>
          <button 
            onClick={() => setView('dashboard')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-leather text-parchment shadow-md' : 'text-leather/40 hover:text-leather'}`}
          >
            Dashboard
          </button>
        </div>
        
        <div className="h-8 w-[1px] bg-leather/10 self-center" />

        <div className="flex flex-1 gap-1">
          <button 
            onClick={() => setActiveChannel('general')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeChannel === 'general' ? 'bg-[#8B4513] text-white shadow-md' : 'text-[#8B4513]/40 hover:text-[#8B4513]'}`}
          >
            General
          </button>
          <button 
            onClick={() => setActiveChannel('highlights')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeChannel === 'highlights' ? 'bg-antique-gold text-leather shadow-md' : 'text-[#D4AF37]/40 hover:text-[#D4AF37]'}`}
          >
            Highlights
          </button>
        </div>
      </div>

      <div className="bg-antique-gold/10 p-4 flex items-center justify-between border-b border-leather/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-leather rounded-full flex items-center justify-center text-parchment shadow-md border-2 border-white">
            <ShieldAlert size={20} className="text-lime" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-leather">Imperial Admin Hub</h4>
            <p className="text-[10px] font-serif italic text-leather/60">Official Support & Proclamations</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-leather text-parchment text-[10px] font-bold uppercase tracking-[0.2em] rounded-lg shadow-sm hover:bg-black transition-all">
          Join Official Chat
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
      ) : view === 'square' ? (
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {messages.slice().reverse().map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/40 backdrop-blur-md rounded-[32px] border-2 border-[#B2AC88]/20 p-8 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Sparkles size={80} className="text-[#B2AC88]" />
                </div>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <img 
                      src={msg.senderPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`} 
                      className="w-10 h-10 rounded-full border-2 border-[#B2AC88]/20 shadow-sm" 
                      alt="" 
                    />
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]">{msg.senderName}</h5>
                      <p className="text-[8px] font-serif italic text-leather/40">Archived on {msg.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteMessage(msg.id)} className="text-red-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  <p className="text-sm font-serif leading-relaxed text-leather/80 group-hover:text-leather transition-colors min-h-[60px]">
                    {msg.text}
                  </p>
                  
                      {/* Reaction Engine */}
                      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[#B2AC88]/10">
                        {['🔥', '📜', '💡', '💯', '🙏'].map((emoji) => (
                          <button 
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                              msg.reactions?.[emoji] 
                                ? 'bg-[#8B4513] text-[#F5F2E7] shadow-sm' 
                                : 'bg-[#F5F2E7]/50 text-[#8B4513] border border-[#B2AC88]/10 hover:bg-[#B2AC88]/20'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{msg.reactions?.[emoji] || 0}</span>
                          </button>
                        ))}
                        <div className="flex-1" />
                        <button 
                          onClick={() => {
                            if (activeChannel === 'highlights' && !isAdmin) {
                              alert("Only Imperial Officers can initiate discussions in the Highlights channel. Please use reactions to express your scholarly dissent or agreement.");
                              return;
                            }
                            setActiveReplyId(activeReplyId === msg.id ? null : msg.id);
                          }}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4513] hover:text-[#D4AF37] transition-colors"
                        >
                          <MessageSquare size={14} />
                          {activeReplyId === msg.id ? 'Close' : 'Discuss'}
                        </button>
                      </div>

                  {/* Reply Input */}
                  <AnimatePresence>
                    {activeReplyId === msg.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-3"
                      >
                        <div className="relative">
                          <textarea
                            placeholder="Add your scholarly insight..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full bg-[#F5F2E7]/30 border border-[#B2AC88]/20 rounded-xl p-3 text-xs font-serif italic outline-none focus:border-[#D4AF37] h-20 resize-none"
                          />
                          <button 
                            onClick={() => handleReply(msg.id)}
                            disabled={!replyText.trim()}
                            className="absolute bottom-3 right-3 p-2 bg-[#8B4513] text-[#F5F2E7] rounded-lg shadow-md hover:bg-[#1A1612] transition-colors disabled:opacity-50"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Nested Comments */}
                  <CommentSection msgId={msg.id} />
                </div>
              </motion.div>
            ))}
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
      {activeChannel === 'highlights' && !isAdmin ? (
        <div className="p-4 bg-white border-t border-saddle-brown/10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B4513]/40">
            Official Highlights is read-only for regular scholars. Add your reactions above!
          </p>
        </div>
      ) : (
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
      )}
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
