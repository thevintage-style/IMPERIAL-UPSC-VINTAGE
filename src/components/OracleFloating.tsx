import React, { useState, useEffect, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Sparkles, Send, Bot, User as UserIcon, Loader2, X, MessageCircle, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { db, collection, getDocs, query, orderBy, limit } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface OracleFloatingProps {
  user: FirebaseUser | SupabaseUser;
}

export function OracleFloating({ user }: OracleFloatingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', content: string }[]>([
    { role: 'bot', content: "Greetings, Aspirant. I am the Oracle, your Imperial Mentor. How shall we refine your UPSC strategy today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isMinimized]);

  const fetchContext = async () => {
    try {
      const q = query(collection(db, 'newsArticles'), orderBy('createdAt', 'desc'), limit(5));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return `Title: ${data.title}\nSummary: ${data.summary}`;
      }).join('\n\n');
    } catch (error) {
      return "";
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const context = await fetchContext();
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const aiResult = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are a world-class UPSC (Civil Services) mentor. Your tone is scholarly, encouraging, and highly analytical. 
          Use the following recent news context if relevant:
          ${context}
          Always relate topics to the UPSC syllabus (GS I-IV). Use bullet points for clarity. Keep responses concise for a chat interface.`
        },
        contents: [{ role: "user", parts: [{ text: userMsg }] }]
      });

      const responseText = aiResult.text;
      setMessages(prev => [...prev, { role: 'bot', content: responseText || "The Oracle is momentarily clouded." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: "A disturbance in the archives. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[5000] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`bg-[#F5F2E7] w-[350px] sm:w-[400px] rounded-3xl border-4 border-[#8B4513] shadow-2xl overflow-hidden flex flex-col ${isMinimized ? 'h-16' : 'h-[500px]'}`}
          >
            {/* Header */}
            <div className="p-4 bg-[#8B4513] text-[#F5F2E7] flex items-center justify-between cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#D4AF37]" />
                <span className="font-serif font-bold text-sm uppercase tracking-widest">The Oracle</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:text-[#D4AF37] transition-colors">
                  <Minimize2 size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:text-[#D4AF37] transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#F5F2E7]">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-2xl text-xs font-serif leading-relaxed max-w-[85%] ${
                        msg.role === 'user' 
                          ? 'bg-[#8B4513] text-[#F5F2E7] rounded-tr-none' 
                          : 'bg-white border border-[#8B4513]/10 text-[#1A1612] rounded-tl-none shadow-sm'
                      }`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-[#8B4513]/10 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                        <Loader2 className="animate-spin text-[#8B4513]" size={14} />
                        <span className="text-[10px] font-serif italic text-[#8B4513]/60">Consulting archives...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-[#8B4513]/10 bg-white">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Ask about GS Papers, Ethics..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      className="w-full bg-[#F5F2E7] border border-[#8B4513]/20 rounded-xl py-2 pl-4 pr-10 text-xs font-serif outline-none focus:border-[#D4AF37]"
                    />
                    <button 
                      onClick={sendMessage}
                      disabled={isLoading || !input.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8B4513] hover:text-[#D4AF37] disabled:opacity-30"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 ${
          isOpen ? 'bg-[#1A1612] text-[#D4AF37] rotate-90' : 'bg-[#8B4513] text-[#F5F2E7]'
        }`}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>
    </div>
  );
}
