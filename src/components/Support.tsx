import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { db, collection, query, onSnapshot, addDoc, serverTimestamp, OperationType, handleFirestoreError, orderBy, where, limit } from '../lib/firebase';
import { Send, MessageSquare, Heart, Phone, Mail, Sparkles, User as UserIcon, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

interface SupportProps {
  user: User;
}

export function Support({ user }: SupportProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'feedback'>('chat');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const ai = new GoogleGenAI({ apiKey: process.env.VINTAGE_ORACLE_KEY || "" });

  useEffect(() => {
    // Find or create chat session
    const chatsPath = 'supportChats';
    const q = query(collection(db, chatsPath), where('userId', '==', user.uid), limit(1));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        const newChat = await addDoc(collection(db, chatsPath), {
          userId: user.uid,
          status: 'active',
          lastMessageAt: serverTimestamp()
        });
        setChatId(newChat.id);
      } else {
        setChatId(snapshot.docs[0].id);
      }
    });

    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (!chatId) return;

    const messagesPath = `supportChats/${chatId}/messages`;
    const q = query(collection(db, messagesPath), orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;

    const messagesPath = `supportChats/${chatId}/messages`;
    const text = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, messagesPath), {
        chatId,
        senderId: user.uid,
        senderRole: 'user',
        text,
        createdAt: serverTimestamp()
      });

      // AI Response Logic
      setIsAIThinking(true);

      if (!process.env.VINTAGE_ORACLE_KEY) {
        setTimeout(async () => {
          const aiText = "The Grand Vizier is currently in a deep meditative state (Guest Mode). While the Imperial Oracle Key is missing, I can still offer basic guidance on your journey. How may I assist you with the archives today?";
          await addDoc(collection(db, messagesPath), {
            chatId,
            senderId: 'ai-assistant',
            senderRole: 'ai',
            text: aiText,
            createdAt: serverTimestamp()
          });
          setIsAIThinking(false);
        }, 1000);
        return;
      }

      const prompt = `You are the Grand Vizier of the Imperial Scholar Platform, a legendary UPSC strategist. 
      A student is seeking your guidance.
      
      Student Query: "${text}"
      
      Your task:
      1. Provide a highly strategic, analytical response focused on UPSC preparation (Prelims, Mains, or Interview).
      2. Use a tone that is authoritative yet encouraging, scholarly, and "Imperial".
      3. If they ask about a specific subject, give them a "Vizier's Tip" on how to approach it.
      4. Keep the response under 150 words.
      
      Structure your response with:
      - A scholarly greeting.
      - Strategic analysis.
      - A concluding word of wisdom.`;

      const aiResult = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      const aiText = aiResult.text || "The Grand Vizier is currently indisposed.";

      await addDoc(collection(db, messagesPath), {
        chatId,
        senderId: 'ai-assistant',
        senderRole: 'ai',
        text: aiText,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, messagesPath);
    } finally {
      setIsAIThinking(false);
    }
  };

  const submitFeedback = async (message: string) => {
    const path = 'supportMessages';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        message,
        type: 'feedback',
        status: 'new',
        createdAt: serverTimestamp()
      });
      alert("Your feedback has been recorded in the Imperial Ledger. Thank you, Scholar.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col gap-8 py-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-serif font-bold text-[#1a1a1a]">Imperial Support</h2>
        <p className="text-[#5A5A40] font-serif italic text-lg">The Grand Vizier's ears are always open to his scholars.</p>
      </div>

      <div className="flex-1 bg-white rounded-[40px] border border-[#5A5A40]/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-[#5A5A40]/5">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-4 font-serif font-bold text-sm transition-all ${activeTab === 'chat' ? 'bg-[#5A5A40] text-white' : 'hover:bg-[#f5f2ed] text-[#5A5A40]'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare size={18} />
              Imperial Chat
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`flex-1 py-4 font-serif font-bold text-sm transition-all ${activeTab === 'feedback' ? 'bg-[#5A5A40] text-white' : 'hover:bg-[#f5f2ed] text-[#5A5A40]'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Heart size={18} />
              Scholarly Feedback
            </div>
          </button>
        </div>

        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="flex justify-center">
                <div className="bg-[#f5f2ed] px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60 border border-[#5A5A40]/10">
                  Secure Imperial Channel Established
                </div>
              </div>

              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex ${msg.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] flex gap-3 ${msg.senderRole === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                      msg.senderRole === 'user' ? 'bg-[#5A5A40] text-white' : 
                      msg.senderRole === 'ai' ? 'bg-[#1a1a1a] text-white' : 'bg-[#f5f2ed] text-[#5A5A40]'
                    }`}>
                      {msg.senderRole === 'user' ? <UserIcon size={14} /> : 
                       msg.senderRole === 'ai' ? <Sparkles size={14} /> : <Shield size={14} />}
                    </div>
                    <div className={`p-4 rounded-2xl font-serif text-sm leading-relaxed ${
                      msg.senderRole === 'user' 
                        ? 'bg-[#5A5A40] text-white rounded-tr-none' 
                        : 'bg-[#f5f2ed] text-[#1a1a1a] rounded-tl-none border border-[#5A5A40]/10'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isAIThinking && (
                <div className="flex justify-start">
                  <div className="bg-[#f5f2ed] p-4 rounded-2xl rounded-tl-none border border-[#5A5A40]/10 flex gap-2">
                    <div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-6 border-t border-[#5A5A40]/5 bg-[#f5f2ed]/30">
              <div className="flex gap-4">
                <input 
                  type="text"
                  placeholder="Inscribe your query..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-white border border-[#5A5A40]/10 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#5A5A40] font-serif"
                />
                <Button 
                  type="submit"
                  disabled={!newMessage.trim() || isAIThinking}
                  className="bg-[#5A5A40] hover:bg-[#4A4A30] text-white rounded-2xl px-8 shadow-lg transition-all"
                >
                  <Send size={20} />
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 p-12 flex flex-col items-center justify-center text-center space-y-8">
            <div className="w-24 h-24 bg-[#f5f2ed] rounded-full flex items-center justify-center text-[#5A5A40] shadow-inner">
              <Heart size={48} />
            </div>
            <div className="max-w-md space-y-4">
              <h3 className="text-2xl font-serif font-bold">Share Your Wisdom</h3>
              <p className="text-[#5A5A40]/60 font-serif italic">How can we improve the Imperial experience for you and your fellow aspirants?</p>
            </div>
            <textarea 
              placeholder="Your thoughts here..."
              className="w-full max-w-lg h-48 bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-3xl p-6 outline-none focus:ring-2 focus:ring-[#5A5A40] font-serif resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitFeedback((e.target as HTMLTextAreaElement).value);
                  (e.target as HTMLTextAreaElement).value = '';
                }
              }}
            />
            <div className="flex gap-8 text-[#5A5A40]/40">
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <span className="text-xs font-serif">+91 11 2345 6789</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <span className="text-xs font-serif">vizier@imperialscholar.com</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
