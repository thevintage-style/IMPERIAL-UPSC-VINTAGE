import React, { useState, useEffect, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Zap, Brain, MessageSquare, History } from 'lucide-react';
import { routeAIRequest } from '../services/aiRouter';
import { db, doc, updateDoc, collection, addDoc, serverTimestamp } from '../lib/firebase';
import { supabase } from '../lib/supabase';

interface OracleOSProps {
  user: FirebaseUser | SupabaseUser;
  onCommand?: (command: string, response: string) => void;
}

// Global Speech Recognition Types
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export function OracleOS({ user, onCommand }: OracleOSProps) {
  const [isListening, setIsListening] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'responding'>('idle');
  
  const recognitionRef = useRef<any>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      // Main Command Recognition
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const currentTranscript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onend = () => {
        if (status === 'listening') {
          handleCommand();
        }
      };

      // Wake Word Recognition (Oracle)
      wakeWordRecognitionRef.current = new SpeechRecognition();
      wakeWordRecognitionRef.current.continuous = true;
      wakeWordRecognitionRef.current.interimResults = false;
      wakeWordRecognitionRef.current.lang = 'en-US';

      wakeWordRecognitionRef.current.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1][0].transcript.toLowerCase();
        if (lastResult.includes('oracle')) {
          activateOracle();
        }
      };

      wakeWordRecognitionRef.current.start();
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (wakeWordRecognitionRef.current) wakeWordRecognitionRef.current.stop();
    };
  }, []);

  const activateOracle = () => {
    setIsWaking(true);
    setStatus('listening');
    setTranscript('');
    setIsListening(true);
    
    // Play subtle chime
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});

    setTimeout(() => {
      recognitionRef.current?.start();
    }, 100);
  };

  const handleCommand = async () => {
    if (!transcript.trim()) {
      setStatus('idle');
      setIsListening(false);
      return;
    }

    setIsProcessing(true);
    setStatus('processing');

    try {
      const uid = (user as any).uid || (user as any).id;
      
      // CONTEXTUAL MEMORY: Fetch recent logs if the query is about progress
      let memoryContext = "";
      if (transcript.toLowerCase().includes('progress') || transcript.toLowerCase().includes('yesterday') || transcript.toLowerCase().includes('today')) {
        const { data: logs } = await supabase
          .from('study_logs')
          .select('*')
          .eq('user_id', uid)
          .limit(3)
          .order('date', { ascending: false });
        
        if (logs && logs.length > 0) {
          memoryContext = `User's recent study logs: ${logs.map(l => `${l.date}: ${l.subject} for ${l.duration_minutes} mins`).join('; ')}`;
        }
      }

      const responseText = await routeAIRequest({
        prompt: transcript,
        type: transcript.length > 100 ? 'essay' : 'logic',
        context: memoryContext
      });

      // Process Actions
      if (transcript.toLowerCase().includes('log') && transcript.toLowerCase().includes('hours')) {
         // Real logging to Supabase
         const subjectMatch = transcript.match(/for (.*?)(\.|$)/i) || transcript.match(/of (.*?)(\.|$)/i);
         const durationMatch = transcript.match(/(\d+)\s*hour/i);
         
         await supabase.from('study_logs').insert({
           user_id: uid,
           subject: subjectMatch ? subjectMatch[1] : "General Study",
           duration_minutes: durationMatch ? parseInt(durationMatch[1]) * 60 : 60,
           notes: "Logged via Voice Command"
         });
      }

      speak(responseText.replace(/\[ACTION:.*?\]/g, '').trim());
      onCommand?.(transcript, responseText);
      
    } catch (error) {
      console.error("Oracle Command Error:", error);
      speak("Forgive me, the archives are momentarily inaccessible.");
    } finally {
      setIsProcessing(false);
      setIsListening(false);
      setStatus('idle');
    }
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 0.8;
    utterance.rate = 1;
    utterance.pitch = 0.9; // Slightly deeper, scholarly voice
    
    utterance.onstart = () => setStatus('responding');
    utterance.onend = () => setStatus('idle');

    synthRef.current.speak(utterance);
  };

  return (
    <div className="fixed bottom-8 left-8 z-50 pointer-events-none">
      <div className="flex flex-col items-start gap-4 pointer-events-auto">
        {/* Glow Orb Visualizer */}
        <div className="relative">
          <AnimatePresence>
            {(status !== 'idle') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 bg-lime/30 rounded-full blur-2xl animate-pulse"
              />
            )}
          </AnimatePresence>

          <button
            onClick={() => status === 'idle' ? activateOracle() : setIsListening(false)}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl relative z-10 ${
              status === 'listening' ? 'bg-lime text-leather scale-110' : 
              status === 'processing' ? 'bg-sage animate-pulse' : 
              status === 'responding' ? 'bg-antique-gold' : 
              'bg-leather text-parchment hover:scale-105'
            }`}
          >
            {status === 'listening' ? <Mic size={24} className="animate-bounce" /> : <Brain size={24} />}
          </button>
        </div>

        {/* Dynamic Status Display */}
        <AnimatePresence>
          {(status !== 'idle' || transcript) && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-morphism p-4 rounded-2xl max-w-xs space-y-2 border-lime/20"
            >
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-lime animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-lime">Oracle Active</span>
              </div>
              
              <p className="text-xs font-serif italic text-parchment/80">
                {status === 'listening' ? (transcript || 'Listening for your command...') : 
                 status === 'processing' ? 'Consulting the Imperial Archives...' : 
                 status === 'responding' ? 'The Oracle speaks...' : 'Ready for Wake Word: "Oracle"'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
