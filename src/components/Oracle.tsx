import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Sparkles, Send, Bot, User as UserIcon, Loader2, Info, Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { db, collection, getDocs, query, orderBy, limit } from '../lib/firebase';
import { supabase } from '../lib/supabase';

interface OracleProps {
  user: User;
}

export function Oracle({ user }: OracleProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', content: string }[]>([
    { role: 'bot', content: "Greetings, Aspirant. I am the Oracle, your Imperial Mentor. I have access to the latest intelligence from The Hindu, Indian Express, and PIB. How shall we refine your preparation today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceIntelligence, setIsVoiceIntelligence] = useState(false);
  const [userContext, setUserContext] = useState<string>('');
  const [isDeepListen, setIsDeepListen] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userId = (user as any).uid || (user as any).id;

  // Wake-Word Listener (Oracle)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && !wakeWordActive) {
      wakeWordRecognitionRef.current = new SpeechRecognition();
      wakeWordRecognitionRef.current.continuous = true;
      wakeWordRecognitionRef.current.interimResults = false;
      wakeWordRecognitionRef.current.lang = 'en-US';

      wakeWordRecognitionRef.current.onresult = (event: any) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript.toLowerCase();
        if (text.includes('oracle')) {
          activateDeepListen();
        }
      };

      try {
        wakeWordRecognitionRef.current.start();
        setWakeWordActive(true);
      } catch (e) {
        console.warn("Wake-word listener couldn't start automatically.");
      }
    }

    return () => {
      if (wakeWordRecognitionRef.current) wakeWordRecognitionRef.current.stop();
    };
  }, [wakeWordActive]);

  const activateDeepListen = () => {
    setIsDeepListen(true);
    speakText("I am listening, Scholar.");
    setTimeout(() => {
      toggleMic(true);
    }, 1500);
  };

  // Initialize contexts (RAG Memory)
  useEffect(() => {
    const fetchUserContext = async () => {
      if (!userId) return;
      try {
        // Fetch latest journal
        const journalSnap = await getDocs(query(
          collection(db, `users/${userId}/journals`),
          orderBy('createdAt', 'desc'),
          limit(1)
        ));
        
        // Fetch latest study logs
        const { data: studyLogs } = await supabase
          .from('study_logs')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(3);

        let context = "";
        if (!journalSnap.empty) {
          context += `User's latest journal: ${journalSnap.docs[0].data().content}\n`;
        }
        if (studyLogs && studyLogs.length > 0) {
          context += `Recent Study Sessions: ${studyLogs.map(l => `${l.subject} for ${l.duration_minutes}m`).join(', ')}`;
        }
        setUserContext(context);
      } catch (err) {
        console.warn("Oracle Context Retrieval Issue:", err);
      }
    };
    fetchUserContext();
  }, [userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchContext = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_news')
        .select('*')
        .order('relevance_score', { ascending: false })
        .limit(5);

      if (error) return "";
      return data?.map(d => `[${d.upsc_category}] ${d.title}: ${d.summary}`).join('\n\n') || "";
    } catch (error) {
      console.error("Context fetch failed", error);
      return "";
    }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // Automatically send after voice input
        processMessage(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const toggleMic = (forceStart = false) => {
    if (isListening && !forceStart) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      setIsDeepListen(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          setIsDeepListen(true);
          if (audioRef.current) {
            audioRef.current.pause();
            setIsSpeaking(false);
          }
        } catch (err) {
          console.error("Failed to start speech recognition", err);
        }
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    }
  };

  const speakText = async (text: string) => {
    try {
      setIsSpeaking(true);
      const endpoint = isVoiceIntelligence ? '/api/tts/elevenlabs' : '/api/tts';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 500) }) 
      });

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsSpeaking(false);
      await audioRef.current.play();
    } catch (error) {
      console.error("Audio playback failed", error);
      setIsSpeaking(false);
    }
  };

  const processMessage = async (msgContent: string) => {
    if (!msgContent.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: msgContent }]);
    setIsLoading(true);
    setInput('');
    
    try {
      const context = await fetchContext();
      const ai = new GoogleGenAI({ apiKey: process.env.VINTAGE_ORACLE_KEY || '' });
      
      const aiResult = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are Oracle, a high-level UPSC mentor. Use the provided context to guide the user.
          
          Current Affairs:
          ${context}
          
          User's Personal Memory:
          ${userContext}
          
          Tone: Scholarly, encouraging, strategic. Reference GS papers where possible.`
        },
        contents: [{ role: "user", parts: [{ text: msgContent }] }]
      });

      const responseText = aiResult.text;
      setMessages(prev => [...prev, { role: 'bot', content: responseText || "The Oracle is momentarily clouded." }]);
      if (responseText) speakText(responseText);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: "A disturbance in the archives." }]);
    } finally {
      setIsLoading(false);
      setIsDeepListen(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    if (audioRef.current) audioRef.current.pause();
    setIsSpeaking(false);
    await processMessage(msg);
  };

  return (
    <div className={`h-full flex flex-col bg-white rounded-3xl border border-[#5A5A40]/10 shadow-sm overflow-hidden transition-all duration-700 relative ${
      isDeepListen ? 'ring-[20px] ring-sage/20 scale-[0.99] z-50' : ''
    }`}>
      <AnimatePresence>
        {isDeepListen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-sage/5 z-0 pointer-events-none overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-sage/20 to-transparent animate-pulse" />
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sage rounded-full blur-[120px]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 border-b border-[#5A5A40]/10 bg-[#5A5A40]/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-md">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-[#1a1a1a]">The Oracle</h3>
            <p className="text-[10px] uppercase tracking-widest text-[#5A5A40]/60 font-bold">Imperial AI Mentor</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsVoiceIntelligence(!isVoiceIntelligence)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${
              isVoiceIntelligence 
                ? 'bg-antique-gold text-leather shadow-[0_0_10px_rgba(212,175,55,0.4)]' 
                : 'bg-leather/5 text-saddle-brown hover:bg-leather/10'
            }`}
          >
            {isVoiceIntelligence ? <Sparkles size={10} /> : <Info size={10} />}
            {isVoiceIntelligence ? 'Professional Voice' : 'Standard Voice'}
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-[#5A5A40]/10">
            <div className={`w-2 h-2 rounded-full ${isDeepListen ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">{isDeepListen ? 'Listening' : 'Ready'}</span>
          </div>
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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text"
              placeholder="Ask the Oracle..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="w-full bg-white border border-[#5A5A40]/20 rounded-2xl py-4 pl-6 pr-12 font-serif focus:ring-2 focus:ring-[#5A5A40] outline-none shadow-inner"
            />
            <button 
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-[#5A5A40] text-white rounded-xl hover:bg-[#4A4A30] transition-all disabled:opacity-50 shadow-md"
            >
              <Send size={16} />
            </button>
          </div>
          
          <button 
            onClick={() => toggleMic()}
            className={`p-4 rounded-full transition-all flex items-center justify-center relative ${
              isListening 
                ? 'bg-red-500 text-white animate-mic-pulse' 
                : 'bg-white border border-[#5A5A40]/20 text-[#5A5A40] hover:bg-[#5A5A40]/5'
            }`}
          >
            {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            {isSpeaking && (
              <div className="absolute -top-1 -right-1 bg-[#CCFF00] text-[#1B2E22] p-1 rounded-full shadow-sm animate-bounce">
                <Volume2 size={12} />
              </div>
            )}
          </button>
        </div>
        <p className="mt-3 text-[10px] text-center text-[#5A5A40]/40 font-serif italic">
          Voice of Oracle: Alloy (OpenAI). AI insights for educational guidance.
        </p>
      </div>
    </div>
  );
}
