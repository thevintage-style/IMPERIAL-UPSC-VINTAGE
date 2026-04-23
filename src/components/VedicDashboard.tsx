import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Quote, 
  Calendar, 
  TrendingUp, 
  BookOpen, 
  Clock,
  Zap,
  Award,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';

interface VedicDashboardProps {
  user: User;
  setActiveTab: (tab: string) => void;
}

export function VedicDashboard({ user, setActiveTab }: VedicDashboardProps) {
  const [quote, setQuote] = useState<string>("Loading scholarly wisdom...");
  const [author, setAuthor] = useState<string>("The Imperial Oracle");
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.VINTAGE_ORACLE_KEY || "" });
        const aiResult = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: "user", parts: [{ text: `
            Generate a powerful, motivational quote for a UPSC (Civil Services) aspirant. 
            The quote should be inspired by Vedic wisdom, ancient Indian philosophy, or the grit required for public service.
            Format: Quote | Author
          ` }] }]
        });
        const text = (aiResult.text || "").trim();
        const [q, a] = text.split('|');
        setQuote(q || text);
        setAuthor(a || "Ancient Wisdom");
      } catch (error) {
        console.error("Error fetching quote:", error);
        setQuote("Success is not final, failure is not fatal: it is the courage to continue that counts.");
        setAuthor("Winston Churchill");
      } finally {
        setIsLoadingQuote(false);
      }
    };

    fetchQuote();
  }, []);

  const stats = [
    { label: 'Study Streak', value: '12 Days', icon: Zap, color: 'text-orange-500' },
    { label: 'Topics Mastered', value: '48', icon: Award, color: 'text-antique-gold' },
    { label: 'Hours Logged', value: '156h', icon: Clock, color: 'text-blue-500' },
    { label: 'Rank Estimate', value: 'Top 5%', icon: TrendingUp, color: 'text-green-500' },
  ];

  return (
    <div className="space-y-8 pb-12 relative">
      {/* Welcome Banner */}
      <div className="relative p-12 rounded-[40px] bg-leather text-parchment overflow-hidden shadow-2xl parchment-glow">
        <div className="absolute top-0 right-0 w-64 h-64 bg-antique-gold/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10 space-y-4">
          <h1 className="text-5xl font-display font-bold tracking-tight">
            Welcome, <span className="handwritten-highlight text-leather">{user.displayName}</span>
          </h1>
          <p className="text-xl font-serif italic text-parchment/60 max-w-2xl">
            "The journey of a thousand miles begins with a single step into the Imperial Archives."
          </p>
          <div className="flex gap-4 pt-4">
            <Button onClick={() => setActiveTab('cartographer')} className="bg-antique-gold hover:bg-white hover:text-leather text-leather rounded-2xl px-8 h-14 font-bold shadow-lg transition-all">
              Resume Expedition
            </Button>
            <Button onClick={() => setActiveTab('folio')} variant="ghost" className="border-2 border-parchment/20 text-parchment rounded-2xl px-8 h-14 hover:bg-parchment/10">
              View Log Book
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Motivation Widget */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border-2 border-saddle-brown/10 p-10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-antique-gold/10 group-hover:text-antique-gold/20 transition-colors">
            <Quote size={120} />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2 text-xs font-bold text-antique-gold uppercase tracking-widest">
              <Sparkles size={16} />
              Daily Imperial Oracle
            </div>
            <AnimatePresence mode="wait">
              {isLoadingQuote ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-32 flex items-center justify-center"
                >
                  <div className="w-8 h-8 border-4 border-antique-gold border-t-transparent rounded-full animate-spin" />
                </motion.div>
              ) : (
                <motion.div
                  key="quote"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <p className="text-3xl font-serif italic leading-relaxed text-leather">
                    "{quote}"
                  </p>
                  <p className="text-sm font-bold text-saddle-brown/60 uppercase tracking-widest text-right">
                    — {author}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-parchment/50 rounded-[40px] border-2 border-saddle-brown/10 p-8 shadow-inner flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-serif font-bold text-saddle-brown mb-6 flex items-center gap-2">
              <TrendingUp size={20} />
              Scholarly Progress
            </h3>
            
            {/* Visual Progress Bar */}
            <div className="mb-8 space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-leather/60">Syllabus Completion</span>
                <span className="text-xl font-bold text-leather">64%</span>
              </div>
              <div className="h-4 w-full bg-leather/10 rounded-full overflow-hidden border border-leather/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '64%' }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-leather to-sage relative"
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                  <motion.div 
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  />
                </motion.div>
              </div>
            </div>

            <div className="space-y-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-saddle-brown/5 flex items-center justify-between group hover:border-antique-gold/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-white shadow-sm ${stat.color}`}>
                      <stat.icon size={20} />
                    </div>
                    <span className="text-sm font-serif text-leather/60">{stat.label}</span>
                  </div>
                  <span className="text-lg font-bold text-leather">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities / Suggested Paths */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'NCERT Library', desc: 'Class 6-12 Essentials', icon: BookOpen, tab: 'resource-hub' },
          { title: 'AI Map Suite', desc: 'Interactive Topography', icon: ChevronRight, tab: 'cartographer' },
          { title: 'Personal Vault', desc: 'Your Saved Archives', icon: Calendar, tab: 'vault' },
          { title: 'Vizier Support', desc: 'Expert Consultation', icon: Sparkles, tab: 'support' },
        ].map((item, idx) => (
          <motion.button
            key={idx}
            whileHover={{ y: -5 }}
            onClick={() => setActiveTab(item.tab)}
            className="bg-white p-6 rounded-3xl border-2 border-saddle-brown/10 shadow-sm hover:shadow-md hover:border-antique-gold/30 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-parchment rounded-2xl flex items-center justify-center text-saddle-brown mb-4 group-hover:bg-antique-gold group-hover:text-white transition-colors">
              <item.icon size={24} />
            </div>
            <h4 className="font-serif font-bold text-leather mb-1">{item.title}</h4>
            <p className="text-xs text-leather/40 font-serif italic">{item.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
