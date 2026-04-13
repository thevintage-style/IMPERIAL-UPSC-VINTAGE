import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  deleteDoc,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Book, 
  Library as LibraryIcon, 
  Plus, 
  Trash2, 
  Download, 
  ExternalLink,
  Search,
  Folder,
  ChevronRight,
  FileText,
  Video
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface LibraryResource {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'link';
  category: 'ncert' | 'standard';
  folder: string;
  url: string;
  createdAt: any;
}

interface LibraryProps {
  user: User;
  isAdmin: boolean;
}

export function Library({ user, isAdmin }: LibraryProps) {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [activeCategory, setActiveCategory] = useState<'ncert' | 'standard'>('ncert');
  const [activeFolder, setActiveFolder] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [newResource, setNewResource] = useState({ title: '', type: 'pdf' as const, url: '', folder: 'General' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'libraryResources'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryResource)));
    });
    return () => unsubscribe();
  }, []);

  const handleAddResource = async () => {
    if (!newResource.title || !newResource.url) return;
    try {
      await addDoc(collection(db, 'libraryResources'), {
        ...newResource,
        category: activeCategory,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewResource({ title: '', type: 'pdf', url: '', folder: 'General' });
    } catch (error) {
      console.error("Error adding resource:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to remove this resource from the Imperial Library?")) {
      try {
        await deleteDoc(doc(db, 'libraryResources', id));
      } catch (error) {
        console.error("Error deleting resource:", error);
      }
    }
  };

  const filteredResources = resources.filter(r => 
    r.category === activeCategory && 
    (activeFolder === 'All' || r.folder === activeFolder) &&
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const folders = ['All', ...Array.from(new Set(resources.filter(r => r.category === activeCategory).map(r => r.folder)))];

  return (
    <div className="h-full flex flex-col space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-saddle-brown text-parchment rounded-2xl shadow-lg">
            <LibraryIcon size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold text-saddle-brown">Imperial Library</h2>
            <p className="text-sm font-serif italic text-saddle-brown/60">The definitive collection of NCERTs and Standard Scholarly Texts.</p>
          </div>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => setIsAdding(true)}
            className="bg-saddle-brown hover:bg-leather text-parchment rounded-2xl px-6 flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            Add Resource
          </Button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-4 border-b border-saddle-brown/10 pb-4">
        <button 
          onClick={() => { setActiveCategory('ncert'); setActiveFolder('All'); }}
          className={`px-8 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
            activeCategory === 'ncert' 
              ? 'bg-saddle-brown text-parchment shadow-md' 
              : 'text-saddle-brown/40 hover:text-saddle-brown'
          }`}
        >
          NCERT Section
        </button>
        <button 
          onClick={() => { setActiveCategory('standard'); setActiveFolder('All'); }}
          className={`px-8 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
            activeCategory === 'standard' 
              ? 'bg-saddle-brown text-parchment shadow-md' 
              : 'text-saddle-brown/40 hover:text-saddle-brown'
          }`}
        >
          Standard Books
        </button>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden">
        {/* Sidebar: Folders */}
        <div className="w-64 space-y-2 overflow-y-auto custom-scrollbar pr-4">
          <p className="text-[10px] font-bold text-saddle-brown/40 uppercase tracking-widest mb-4 px-4">Subject Folders</p>
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeFolder === folder 
                  ? 'bg-antique-gold/10 text-saddle-brown font-bold border border-antique-gold/20' 
                  : 'text-saddle-brown/60 hover:bg-parchment'
              }`}
            >
              <Folder size={18} className={activeFolder === folder ? 'text-antique-gold' : 'text-saddle-brown/20'} />
              <span className="text-sm font-serif">{folder}</span>
            </button>
          ))}
        </div>

        {/* Main Content: Resources */}
        <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-saddle-brown/40" size={18} />
            <input 
              type="text"
              placeholder={`Search in ${activeCategory === 'ncert' ? 'NCERTs' : 'Standard Books'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-saddle-brown/10 rounded-2xl py-3 pl-12 pr-4 font-serif outline-none focus:border-antique-gold shadow-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredResources.map((res) => (
                  <motion.div
                    key={res.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white p-6 rounded-3xl border-2 border-saddle-brown/10 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-parchment rounded-2xl text-saddle-brown">
                        {res.type === 'pdf' ? <FileText size={24} /> : <Video size={24} />}
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleDelete(res.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <h4 className="font-serif font-bold text-leather mb-2 line-clamp-2">{res.title}</h4>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[10px] font-bold text-saddle-brown/40 uppercase tracking-widest">{res.folder}</span>
                      <a 
                        href={res.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-antique-gold text-leather rounded-xl hover:bg-saddle-brown hover:text-parchment transition-all shadow-sm"
                      >
                        {res.type === 'pdf' ? <Download size={18} /> : <ExternalLink size={18} />}
                      </a>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {filteredResources.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-parchment rounded-full flex items-center justify-center mx-auto mb-4 text-saddle-brown/20">
                  <Book size={32} />
                </div>
                <h3 className="font-serif text-xl font-bold text-saddle-brown/40">No Scrolls Found</h3>
                <p className="text-sm font-serif italic text-saddle-brown/20">Try adjusting your search or category.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Resource Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-leather/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-parchment w-full max-w-md rounded-3xl border-4 border-saddle-brown shadow-2xl p-8"
            >
              <h3 className="text-2xl font-serif font-bold text-saddle-brown mb-6">Add to Imperial Library</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-saddle-brown/60">Title</label>
                  <input 
                    type="text"
                    value={newResource.title}
                    onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                    className="w-full bg-white border-2 border-saddle-brown/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-antique-gold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-saddle-brown/60">Type</label>
                  <select 
                    value={newResource.type}
                    onChange={(e) => setNewResource({...newResource, type: e.target.value as any})}
                    className="w-full bg-white border-2 border-saddle-brown/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-antique-gold"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="video">Video Lecture</option>
                    <option value="link">External Link</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-saddle-brown/60">Folder / Subject</label>
                  <input 
                    type="text"
                    value={newResource.folder}
                    onChange={(e) => setNewResource({...newResource, folder: e.target.value})}
                    className="w-full bg-white border-2 border-saddle-brown/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-antique-gold"
                    placeholder="e.g. History, Geography"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-saddle-brown/60">Resource URL</label>
                  <input 
                    type="url"
                    value={newResource.url}
                    onChange={(e) => setNewResource({...newResource, url: e.target.value})}
                    className="w-full bg-white border-2 border-saddle-brown/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-antique-gold"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <Button onClick={() => setIsAdding(false)} variant="ghost" className="flex-1 rounded-xl border-2 border-saddle-brown/10">Cancel</Button>
                <Button onClick={handleAddResource} className="flex-1 bg-saddle-brown hover:bg-leather text-parchment rounded-xl">Publish Resource</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
