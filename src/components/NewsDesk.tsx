import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Newspaper, ExternalLink, Bookmark, RefreshCw, ChevronRight, Zap, BookOpen, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { db, collection, onSnapshot, query, orderBy, OperationType, handleFirestoreError, doc } from '../lib/firebase';

interface NewsDeskProps {
  user: User;
}

export function NewsDesk({ user }: NewsDeskProps) {
  const [news, setNews] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isAdmin = user?.email === "raksha05jk.rao@gmail.com";

  useEffect(() => {
    const path = 'newsArticles';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    const metaUnsubscribe = onSnapshot(doc(db, 'system_meta', 'news_sync'), (snapshot) => {
      if (snapshot.exists()) {
        setLastSync(snapshot.data());
      }
    });

    return () => {
      unsubscribe();
      metaUnsubscribe();
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/news/sync', { method: 'POST' });
      const data = await response.json();
      alert(data.message || "News sync initiated.");
    } catch (error) {
      alert("Failed to initiate news reconnaissance.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-3xl font-bold text-[#1a1a1a]">Daily Reconnaissance</h3>
          <p className="text-sm font-serif italic text-[#5A5A40]/60">Summarized intelligence from The Hindu, Indian Express, and PIB.</p>
          {lastSync && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mt-1">
              Last Intelligence Update: {new Date(lastSync.lastSync).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button 
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-[#5A5A40] text-white hover:bg-[#4A4A30] rounded-xl px-6 shadow-md"
            >
              <Zap size={16} className={`mr-2 ${isSyncing ? 'animate-pulse' : ''}`} />
              {isSyncing ? "Syncing..." : "Sync News Engine"}
            </Button>
          )}
          <Button 
            onClick={() => setIsLoading(true)}
            disabled={isLoading}
            className="bg-white text-[#5A5A40] border border-[#5A5A40]/20 hover:bg-[#f5f2ed] rounded-xl px-4 shadow-sm"
          >
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm animate-pulse">
              <div className="h-4 bg-[#5A5A40]/10 rounded w-1/4 mb-4" />
              <div className="h-6 bg-[#5A5A40]/10 rounded w-3/4 mb-4" />
              <div className="h-20 bg-[#5A5A40]/10 rounded w-full mb-4" />
              <div className="h-4 bg-[#5A5A40]/10 rounded w-1/2" />
            </div>
          ))
        ) : (
          news.map((item) => (
            <div key={item.id} className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-lg hover:shadow-xl transition-all duration-300 group flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40] bg-[#5A5A40]/5 px-3 py-1 rounded-full border border-[#5A5A40]/10">
                    {item.source}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-[#5A5A40] px-3 py-1 rounded-full">
                    {item.gsPaper}
                  </span>
                </div>
                <button className="text-[#5A5A40]/40 hover:text-[#5A5A40] transition-colors">
                  <Bookmark size={18} />
                </button>
              </div>

              <h4 className="font-serif font-bold text-xl mb-4 leading-snug group-hover:text-[#5A5A40] transition-colors">
                {item.title}
              </h4>

              <div className="flex-1 space-y-4 mb-8">
                <p className="text-sm font-serif text-[#1a1a1a]/80 leading-relaxed italic">
                  {item.summary}
                </p>
                
                {item.prelimsFacts && item.prelimsFacts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60 flex items-center gap-1">
                      <BookOpen size={12} /> Prelims Facts
                    </p>
                    <ul className="text-xs font-serif text-[#5A5A40] space-y-1">
                      {item.prelimsFacts.slice(0, 2).map((fact: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-yellow-600">•</span> {fact}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-[#5A5A40]/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-[#5A5A40]/40">
                  <Clock size={12} />
                  {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
                <a 
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-serif font-bold text-[#5A5A40] hover:underline group-hover:translate-x-1 transition-transform"
                >
                  Full Intel
                  <ChevronRight size={14} />
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {!isLoading && news.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[40px] border border-[#5A5A40]/10 border-dashed">
          <Newspaper className="mx-auto text-[#5A5A40]/20 mb-4" size={48} />
          <p className="text-[#5A5A40]/60 font-serif italic">The news scrolls are currently empty. Initiate reconnaissance to populate.</p>
        </div>
      )}

      <div className="bg-[#1a1a1a] text-white p-12 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h3 className="font-serif text-3xl font-bold mb-4">Weekly Editorial Analysis</h3>
          <p className="font-serif italic text-white/70 mb-8 text-lg">
            "The strength of a bureaucracy lies in its ability to adapt while maintaining the integrity of the state archives."
          </p>
          <Button className="bg-white text-[#1a1a1a] hover:bg-white/90 rounded-full px-8 py-6 text-lg font-bold shadow-xl">
            Read Special Report
          </Button>
        </div>
        <Newspaper className="absolute -right-20 -bottom-20 w-80 h-80 text-white/5 rotate-12" />
      </div>
    </div>
  );
}
