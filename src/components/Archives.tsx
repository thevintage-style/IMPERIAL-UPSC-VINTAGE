import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, OperationType, handleFirestoreError } from '../lib/firebase';
import { BookOpen, FileText, Video, ExternalLink, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Archives() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    const path = 'resources';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, []);

  const categories = [
    { id: 'all', label: 'All Resources' },
    { id: 'prelims', label: 'Prelims' },
    { id: 'mains', label: 'Mains' },
    { id: 'interview', label: 'Interview' },
    { id: 'current-affairs', label: 'Current Affairs' },
  ];

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(search.toLowerCase()) || 
                         res.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || res.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText size={20} />;
      case 'video': return <Video size={20} />;
      default: return <ExternalLink size={20} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-serif font-bold text-[#1a1a1a]">Imperial Archives</h2>
        <p className="text-[#5A5A40] font-serif italic text-lg">Curated intelligence for the dedicated aspirant.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-6 rounded-[32px] border border-[#5A5A40]/10 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A5A40]/40" size={20} />
          <input 
            type="text"
            placeholder="Search the archives..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-2xl py-3 pl-12 pr-6 outline-none focus:ring-2 focus:ring-[#5A5A40] font-serif"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto max-w-full pb-2 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-2 rounded-xl text-sm font-serif font-bold transition-all whitespace-nowrap ${
                activeCategory === cat.id 
                  ? "bg-[#5A5A40] text-white shadow-md" 
                  : "bg-[#f5f2ed] text-[#5A5A40]/60 hover:text-[#5A5A40]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5A5A40]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredResources.map((res) => (
              <motion.div
                layout
                key={res.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-lg hover:shadow-xl transition-all flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-[#f5f2ed] rounded-2xl text-[#5A5A40]">
                    {getIcon(res.type)}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-[#5A5A40]/10 text-[#5A5A40] px-3 py-1 rounded-full">
                    {res.category}
                  </span>
                </div>

                <h3 className="text-xl font-serif font-bold text-[#1a1a1a] mb-3">{res.title}</h3>
                <p className="text-sm text-[#5A5A40]/60 font-serif italic mb-8 flex-1">
                  {res.description || "No description provided for this archive entry."}
                </p>

                <a 
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#f5f2ed] text-[#5A5A40] py-4 rounded-2xl font-bold hover:bg-[#e5e2dd] transition-all flex items-center justify-center gap-2 group"
                >
                  Access Resource
                  <ExternalLink size={16} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && filteredResources.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[40px] border border-[#5A5A40]/10 border-dashed">
          <BookOpen className="mx-auto text-[#5A5A40]/20 mb-4" size={48} />
          <p className="text-[#5A5A40]/60 font-serif italic">No scrolls found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
