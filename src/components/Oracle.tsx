import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Sparkles, Send, Bot, User as UserIcon, Loader2, Info } from 'lucide-react';
import { Button } from './ui/button';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { db, collection, getDocs, query, orderBy, limit } from '../lib/firebase';

interface OracleProps {
  user: User;
}

export function Oracle({ user }: OracleProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', content: string }[]>([
    { role: 'bot', content: "Greetings, Aspirant. I am the Oracle, your Imperial Mentor. I have access to the latest intelligence from The Hindu, Indian Express, and PIB. How shall we refine your preparation today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchContext = async () => {
    try {
      const q = query(collection(db, 'newsArticles'), orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return `Title: ${data.title}\nSource: ${data.source}\nGS Paper: ${data.gsPaper}\nSummary: ${data.summary}\nFacts: ${data.prelimsFacts?.join(', ')}`;
      }).join('\n\n');
    } catch (error) {
      console.error("Context fetch failed", error);
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
      
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are a world-class UPSC (Civil Services) mentor. Your tone is scholarly, encouraging, and highly analytical. 
          You have access to the following recent current affairs context:
          
          ${context}
          
          When answering, use this context if relevant. If the student asks about specific recent news, refer to these summaries. 
          Always relate topics to the UPSC syllabus (GS I-IV). Use bullet points for clarity.`
        },
        contents: userMsg
      });

      const responseText = response.text;

      setMessages(prev => [...prev, { role: 'bot', content: responseText || "The Oracle is momentarily clouded. Please rephrase." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: "A disturbance in the archives. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl border border-[#5A5A40]/10 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-[#5A5A40]/10 bg-[#5A5A40]/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-md">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-[#1a1a1a]">The Oracle</h3>
            <p className="text-[10px] uppercase tracking-widest text-[#5A5A40]/60 font-bold">Imperial AI Mentor</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-[#5A5A40]/10">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">Ready</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm ${
                msg.role === 'user' ? 'bg-[#f5f2ed] text-[#5A5A40]' : 'bg-[#5A5A40] text-white'
              }`}>
                {msg.role === 'user' ? <UserIcon size={20} /> : <Bot size={20} />}
              </div>
              <div className={`p-6 rounded-3xl font-serif text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-[#f5f2ed] text-[#1a1a1a] rounded-tr-none' 
                  : 'bg-white border border-[#5A5A40]/10 text-[#1a1a1a] rounded-tl-none shadow-sm'
              }`}>
                <div className="markdown-body">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-4 items-center bg-white border border-[#5A5A40]/10 p-4 rounded-3xl shadow-sm">
              <Loader2 className="animate-spin text-[#5A5A40]" size={20} />
              <span className="font-serif italic text-sm text-[#5A5A40]/60">Consulting the archives...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-[#5A5A40]/10 bg-[#f5f2ed]/30">
        <div className="relative">
          <input 
            type="text"
            placeholder="Ask the Oracle about GS Paper II, Ethics, or your progress..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="w-full bg-white border border-[#5A5A40]/20 rounded-2xl py-4 pl-6 pr-16 font-serif focus:ring-2 focus:ring-[#5A5A40] outline-none shadow-inner"
          />
          <button 
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-[#5A5A40] text-white rounded-xl hover:bg-[#4A4A30] transition-all disabled:opacity-50 shadow-md"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="mt-3 text-[10px] text-center text-[#5A5A40]/40 font-serif italic">
          AI insights are generated for educational purposes. Cross-reference with official NCERT and PIB sources.
        </p>
      </div>
    </div>
  );
}
