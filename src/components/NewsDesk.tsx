import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Newspaper, 
  ExternalLink, 
  Bookmark, 
  RefreshCw, 
  ChevronRight, 
  Zap, 
  BookOpen, 
  Clock, 
  Sparkles, 
  Calendar as CalendarIcon,
  Archive,
  Search,
  Filter,
  History
} from 'lucide-react';
import { Button } from './ui/button';
import { db, collection, onSnapshot, query, orderBy, OperationType, handleFirestoreError, doc, updateDoc } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';

interface NewsDeskProps {
  user: User;
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
  summary: string;
  gsPaper: string;
  upsc_category?: string;
  date: string;
  url: string;
  aiAnalyzed?: boolean;
}

export function NewsDesk({ user }: NewsDeskProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'archive'>('daily');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [archiveNews, setArchiveNews] = useState<NewsItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const isAdmin = user?.email === "raksha05jk.rao@gmail.com";

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyNews();
    } else {
      fetchArchive(selectedDate);
    }
  }, [activeTab, selectedDate]);

  const fetchDailyNews = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_news')
        .select('*')
        .order('relevance_score', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Fallback: Fetch archives from previous day
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const { data: archiveData, error: archiveError } = await supabase
          .from('news_archives')
          .select('*')
          .eq('date_published', yesterdayStr)
          .order('relevance_score', { ascending: false });

        if (!archiveError && archiveData && archiveData.length > 0) {
          setNews(archiveData.map(d => ({
            ...d,
            gsPaper: d.upsc_category,
            date: d.date_published,
            isFallback: true
          })));
          return;
        }
      }

      setNews(data?.map(d => ({
        ...d,
        gsPaper: d.upsc_category,
        date: d.date_published
      })) || []);
    } catch (error) {
      console.error("Daily News Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArchive = async (date: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('news_archives')
        .select('*')
        .eq('date_published', date)
        .order('relevance_score', { ascending: false });

      if (error) throw error;
      setArchiveNews(data?.map(d => ({
        ...d,
        gsPaper: d.upsc_category,
        date: d.date_published
      })) || []);
    } catch (error) {
      console.error("Archive Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const response = await fetch('/api/news/sync', { method: 'POST' });
      const data = await response.json();
      alert(data.message);
      fetchDailyNews();
    } catch (error) {
      alert("Imperial News Engine failed to initialize.");
    } finally {
      setIsSyncing(false);
    }
  };

  const CalendarHeader = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    return (
      <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide">
        {dates.map(date => {
          const isActive = selectedDate === date;
          const dObj = new Date(date);
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`flex flex-col items-center min-w-[70px] p-3 rounded-2xl border-2 transition-all ${
                isActive 
                  ? 'bg-antique-gold border-saddle-brown text-leather shadow-lg scale-105' 
                  : 'bg-white border-saddle-brown/10 text-saddle-brown/40 hover:border-saddle-brown/30'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-tighter mb-1">
                {dObj.toLocaleDateString('en-GB', { weekday: 'short' })}
              </span>
              <span className="text-xl font-serif font-bold">
                {dObj.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="font-serif text-4xl font-bold text-saddle-brown">Crier's News Desk</h3>
          <p className="text-sm font-serif italic text-saddle-brown/60">Automated intelligence for the dedicated scholar.</p>
        </div>
        
        <div className="flex bg-[#F5F2E7] p-1.5 rounded-2xl border border-saddle-brown/10 shadow-inner">
          {isAdmin && (
            <button 
              onClick={triggerSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-leather hover:bg-white bg-parchment/60 mr-2`}
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> Sync Engine
            </button>
          )}
          <button 
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'daily' ? 'bg-white text-saddle-brown shadow-md' : 'text-saddle-brown/40 hover:text-saddle-brown'}`}
          >
            <Newspaper size={16} /> Daily Feed
          </button>
          <button 
            onClick={() => setActiveTab('archive')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'archive' ? 'bg-white text-saddle-brown shadow-md' : 'text-saddle-brown/40 hover:text-saddle-brown'}`}
          >
            <History size={16} /> Archive
          </button>
        </div>
      </div>

      {activeTab === 'archive' && <CalendarHeader />}

      {/* Main Content Area */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + selectedDate}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`grid grid-cols-1 ${activeTab === 'archive' ? 'gap-4' : 'md:grid-cols-2 lg:grid-cols-3 gap-8'}`}
          >
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-white/50 h-64 rounded-[40px] border border-saddle-brown/10 animate-pulse" />
              ))
            ) : (
              (activeTab === 'daily' ? news : archiveNews).map((item, idx) => (
                activeTab === 'daily' ? (
                  /* Daily Card View */
                  <div key={item.id} className="bg-white p-8 rounded-[40px] border border-saddle-brown/10 shadow-lg hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-antique-gold/10 text-saddle-brown/40 text-[8px] font-bold uppercase tracking-widest px-4 py-2 rounded-bl-2xl">
                      {item.source}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-leather text-parchment text-[10px] font-bold rounded-full uppercase tracking-widest">
                        {item.gsPaper}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-xl mb-4 leading-tight group-hover:text-leather transition-colors">
                      {item.title}
                    </h4>

                    <p className="text-sm font-serif text-leather/70 line-clamp-3 mb-6 italic leading-relaxed">
                      {item.summary}
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-saddle-brown/5">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-antique-gold">
                          <Zap size={14} />
                          <span className="text-[10px] font-bold">{(item as any).relevance_score || 7}+</span>
                        </div>
                      </div>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-serif font-bold text-saddle-brown hover:underline">
                        Read More <ChevronRight size={14} />
                      </a>
                    </div>
                  </div>
                ) : (
                  /* Timeline View for Archive */
                  <div key={item.id} className="flex gap-6 group">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-antique-gold/20 flex items-center justify-center border-2 border-antique-gold/50 text-leather">
                        <Archive size={20} />
                      </div>
                      <div className="w-[2px] flex-1 bg-antique-gold/20 my-2" />
                    </div>
                    <div className="flex-1 pb-10">
                      <div className="bg-white p-6 rounded-3xl border border-saddle-brown/10 shadow-md group-hover:shadow-lg transition-all group-hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[10px] font-bold text-antique-gold uppercase tracking-[0.2em]">{item.gsPaper}</span>
                            <h5 className="font-serif font-bold text-lg text-saddle-brown mt-1">{item.title}</h5>
                          </div>
                          <span className="text-[10px] bg-parchment px-3 py-1 rounded-full text-leather/40 font-bold uppercase">{item.source}</span>
                        </div>
                        <p className="text-sm font-serif text-leather/60 italic leading-relaxed">{item.summary}</p>
                      </div>
                    </div>
                  </div>
                )
              ))
            )}
          </motion.div>
        </AnimatePresence>

        {/* Empty State */}
        {!isLoading && (activeTab === 'daily' ? news : archiveNews).length === 0 && (
          <div className="text-center py-20 bg-white/30 rounded-[40px] border border-saddle-brown/10 border-dashed">
            <Newspaper className="mx-auto text-saddle-brown/20 mb-4" size={48} />
            <p className="text-saddle-brown/60 font-serif italic">No chronicles found for this period in the scrolls.</p>
          </div>
        )}
      </div>

      {/* Decorative Footer */}
      <div className="bg-saddle-brown text-parchment p-12 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="text-antique-gold" size={32} />
            <h3 className="font-serif text-3xl font-bold">The Oracle's Verdict</h3>
          </div>
          <p className="font-serif text-lg italic opacity-80 max-w-2xl leading-relaxed">
            "Knowledge without organization is merely noise. In the archives of the state, every fact must find its place within the grand tapestry of governance."
          </p>
        </div>
        <Newspaper className="absolute -right-16 -bottom-16 w-64 h-64 text-parchment/5 -rotate-12" />
      </div>
    </div>
  );
}
