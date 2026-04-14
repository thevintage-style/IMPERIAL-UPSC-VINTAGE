import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { GoogleGenAI } from "@google/genai";
import { Terminal, Sparkles, Send, Code, Cpu, Zap, History } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface VizierStudioProps {
  user: User;
}

export function VizierStudio({ user }: VizierStudioProps) {
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState<{ role: 'user' | 'vizier', content: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.VINTAGE_ORACLE_KEY || "" });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [responses]);

  const handleConsult = async () => {
    if (!prompt.trim() || isProcessing) return;

    const userPrompt = prompt;
    setPrompt('');
    setResponses(prev => [...prev, { role: 'user', content: userPrompt }]);
    setIsProcessing(true);
    
    if (!process.env.VINTAGE_ORACLE_KEY) {
      setTimeout(() => {
        setResponses(prev => [...prev, { role: 'vizier', content: "The Imperial Forge is currently in **Safe Mode** (Guest Mode). While the Oracle Key is missing, I can still discuss architectural concepts, but I cannot forge new AI-driven logic at this time.\n\n*Tip: Ask me about the Parchment Design System!*" }]);
        setIsProcessing(false);
      }, 1000);
      return;
    }

    try {
      const aiResult = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: `
          You are the Grand Vizier, a master architect and AI assistant for the Imperial UPSC Portal.
          The user is a developer or owner asking for technical advice, code snippets, or feature ideas.
          Maintain a scholarly, vintage, yet highly technical persona.
          
          User Request: ${userPrompt}
        ` }] }]
      });
      
      setResponses(prev => [...prev, { role: 'vizier', content: aiResult.text || "" }]);
    } catch (error) {
      console.error("Vizier Studio Error:", error);
      setResponses(prev => [...prev, { role: 'vizier', content: "The Imperial conduits are currently congested. Please try again later." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-leather rounded-2xl shadow-lg">
            <Cpu className="text-antique-gold" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-leather">Vizier's Forge</h2>
            <p className="text-sm text-saddle-brown font-serif italic">The AI Development Sanctum</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-antique-gold/10 rounded-full border border-antique-gold/20">
            <Zap size={14} className="text-antique-gold animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-antique-gold">Gemini 1.5 Flash Active</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 parchment-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-saddle-brown/10 flex items-center justify-between bg-leather/5">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-saddle-brown" />
              <span className="text-xs font-bold uppercase tracking-widest text-leather/60">Console Output</span>
            </div>
            <button 
              onClick={() => setResponses([])}
              className="text-[10px] font-bold uppercase tracking-widest text-saddle-brown hover:text-leather transition-colors"
            >
              Clear Logs
            </button>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
          >
            {responses.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 grayscale">
                <Code size={64} className="mb-4" />
                <p className="font-serif italic text-lg">"The forge awaits your command, Architect."</p>
              </div>
            )}
            
            {responses.map((res, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: res.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${res.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-6 rounded-3xl shadow-sm ${
                  res.role === 'user' 
                    ? 'bg-saddle-brown text-parchment rounded-tr-none' 
                    : 'bg-white border border-saddle-brown/20 text-leather rounded-tl-none'
                }`}>
                  <div className="flex items-center gap-2 mb-2 opacity-60">
                    {res.role === 'user' ? <History size={12} /> : <Sparkles size={12} />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {res.role === 'user' ? 'Architect' : 'Grand Vizier'}
                    </span>
                  </div>
                  <div className="prose prose-sm font-serif leading-relaxed">
                    <ReactMarkdown>{res.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white border border-saddle-brown/20 p-6 rounded-3xl rounded-tl-none shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-antique-gold rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-antique-gold rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-antique-gold rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-leather/5 border-t border-saddle-brown/10">
            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleConsult();
                  }
                }}
                placeholder="Instruct the Vizier to forge new features..."
                className="w-full bg-white border-2 border-saddle-brown/20 rounded-2xl p-4 pr-16 font-serif text-leather focus:border-saddle-brown outline-none transition-all resize-none h-24"
              />
              <button 
                onClick={handleConsult}
                disabled={isProcessing || !prompt.trim()}
                className="absolute right-4 bottom-4 p-3 bg-saddle-brown text-parchment rounded-xl shadow-lg hover:bg-leather transition-all disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: Blueprints */}
        <div className="w-80 space-y-6">
          <div className="parchment-card p-6">
            <h3 className="font-display font-bold text-leather mb-4 flex items-center gap-2">
              <History size={18} className="text-saddle-brown" />
              Recent Blueprints
            </h3>
            <div className="space-y-3">
              {['Payment Gateway', 'Profile Editor', 'AI Studio'].map((item, i) => (
                <div key={i} className="p-3 bg-leather/5 rounded-xl border border-saddle-brown/10 hover:bg-leather/10 transition-colors cursor-pointer group">
                  <p className="text-xs font-serif font-bold text-leather group-hover:text-saddle-brown transition-colors">{item}</p>
                  <p className="text-[10px] text-leather/40 mt-1">v1.0.{i+5} • Deployed</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-leather p-6 rounded-3xl shadow-xl border border-antique-gold/20">
            <h3 className="font-display font-bold text-antique-gold mb-4">Forge Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-parchment/40">Compute</span>
                <span className="text-[10px] font-bold text-antique-gold">Optimal</span>
              </div>
              <div className="w-full bg-parchment/10 h-1 rounded-full overflow-hidden">
                <div className="bg-antique-gold h-full w-[85%]" />
              </div>
              <p className="text-[10px] text-parchment/60 font-serif italic">
                "The Imperial Forge is operating at peak efficiency. All blueprints are being archived in the Grand Library."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
