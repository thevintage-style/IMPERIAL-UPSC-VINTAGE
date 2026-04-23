import React, { useState, useEffect, useRef } from 'react';
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
  where,
  limit,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
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
  Video,
  Sparkles,
  Upload,
  File,
  User as UserIcon,
  Clock,
  Filter,
  AlertCircle,
  X,
  CheckCircle2
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface ResourceHubItem {
  id: string;
  title: string;
  file_url: string;
  uploader_name: string;
  uploader_id: string;
  category: string;
  type: 'pdf' | 'video' | 'link';
  timestamp: any;
}

interface IntegratedResourceHubProps {
  user: User;
  isAdmin: boolean;
}

export function IntegratedResourceHub({ user, isAdmin }: IntegratedResourceHubProps) {
  const [resources, setResources] = useState<ResourceHubItem[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<ResourceHubItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeType, setActiveType] = useState<string>('All');
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  const [newResource, setNewResource] = useState({ 
    title: '', 
    category: 'General', 
    type: 'pdf' as 'pdf' | 'video' | 'link',
    file: null as File | null,
    externalUrl: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Wait for Firebase auth to be ready
    if (!user || !db) return;

    const q = query(collection(db, 'resource_hub'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResourceHubItem)));
    }, (error) => {
      // Don't throw for list operations to prevent app crash, just log and notify
      console.error("Resource Hub Listener Error:", error);
      if (error.message.includes('permission-denied')) {
        setStatus({ type: 'error', message: "Imperial Authentication pending. Retrying link to Archives..." });
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user?.uid || resources.length === 0 || !db) return;
    const q = query(
      collection(db, 'recentlyViewed'), 
      where('userId', '==', user.uid),
      orderBy('viewedAt', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const viewedIds = snapshot.docs.map(doc => doc.data().resourceId);
      const viewedResources = viewedIds.map(id => resources.find(r => r.id === id)).filter(Boolean) as ResourceHubItem[];
      setRecentlyViewed(viewedResources);
    }, (error) => {
      console.warn("Recently Viewed Listener (Recoverable):", error);
    });
    return () => unsubscribe();
  }, [user?.uid, resources]);

  const recordView = async (resource: ResourceHubItem) => {
    if (!user?.uid) return;
    try {
      const viewRef = doc(db, 'recentlyViewed', `${user.uid}_${resource.id}`);
      await setDoc(viewRef, {
        userId: user.uid,
        resourceId: resource.id,
        viewedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error recording view:", error);
    }
  };

  const handleUpload = async () => {
    if (!newResource.title || (!newResource.file && !newResource.externalUrl)) {
      setStatus({ type: 'error', message: "Please provide a title and either a file or a URL." });
      return;
    }

    setIsUploading(true);
    setStatus({ type: 'info', message: "Uploading to Imperial Archives..." });
    try {
      let finalUrl = newResource.externalUrl;

      if (newResource.file) {
        const storageRef = ref(storage, `resource_hub/${Date.now()}_${newResource.file.name}`);
        const uploadResult = await uploadBytes(storageRef, newResource.file);
        finalUrl = await getDownloadURL(uploadResult.ref);
      }

      await addDoc(collection(db, 'resource_hub'), {
        title: newResource.title,
        file_url: finalUrl,
        uploader_name: user.displayName || 'Anonymous Scholar',
        uploader_id: user.uid,
        category: newResource.category,
        type: newResource.type,
        timestamp: serverTimestamp()
      });

      setStatus({ type: 'success', message: "Resource successfully archived in the Hub." });
      setNewResource({ title: '', category: 'General', type: 'pdf', file: null, externalUrl: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'resource_hub');
      setStatus({ type: 'error', message: "The Imperial archives could not accept the file. Please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'resource_hub', id));
      setStatus({ type: 'success', message: "Resource removed from the Hub." });
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'resource_hub');
      setStatus({ type: 'error', message: "Delete failed." });
    }
  };

  const filteredResources = resources.filter(r => {
    const matchesSearch = 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'All' || r.category === activeCategory;
    const matchesType = activeType === 'All' || r.type === activeType;

    return matchesSearch && matchesCategory && matchesType;
  });

  const categories = ['All', ...Array.from(new Set(resources.map(r => r.category)))];
  const types = ['All', 'pdf', 'video', 'link'];

  return (
    <div className="h-full flex flex-col space-y-8">
      {/* Status Notifications */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 right-8 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-md ${
              status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              status.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <p className="text-sm font-serif font-medium">{status.message}</p>
            <button onClick={() => setStatus(null)} className="ml-auto p-1 hover:bg-black/5 rounded-lg">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-[32px] border-2 border-red-100 shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Remove Resource?</h3>
              <p className="text-sm text-gray-500 font-serif italic mb-8">This action cannot be undone. The resource will be purged from the Imperial Archives.</p>
              <div className="flex gap-3">
                <Button onClick={() => setConfirmDelete(null)} variant="ghost" className="flex-1 rounded-xl">Cancel</Button>
                <Button onClick={() => handleDelete(confirmDelete)} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl">Remove</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-saddle-brown text-parchment rounded-2xl shadow-lg">
            <LibraryIcon size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold text-saddle-brown">Integrated Resource Hub</h2>
            <p className="text-sm font-serif italic text-saddle-brown/60">The unified repository for all UPSC scholarly materials.</p>
          </div>
        </div>
      </div>

      {/* Recently Viewed Section */}
      {recentlyViewed.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-saddle-brown/60">
            <Sparkles size={16} className="text-antique-gold" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Recently Accessed Scrolls</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            {recentlyViewed.map((res) => (
              <motion.a
                key={`recent-${res.id}`}
                href={res.file_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordView(res)}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-shrink-0 w-64 bg-white p-4 rounded-2xl border border-saddle-brown/10 shadow-sm hover:shadow-md transition-all flex items-center gap-3 group"
              >
                <div className="p-2 bg-parchment rounded-xl text-saddle-brown group-hover:bg-antique-gold group-hover:text-leather transition-colors">
                  {res.type === 'pdf' ? <FileText size={18} /> : res.type === 'video' ? <Video size={18} /> : <ExternalLink size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-serif font-bold text-leather truncate">{res.title}</p>
                  <p className="text-[10px] text-saddle-brown/40 uppercase tracking-widest">{res.category}</p>
                </div>
                <ChevronRight size={16} className="text-saddle-brown/20 group-hover:text-antique-gold transition-colors" />
              </motion.a>
            ))}
          </div>
        </div>
      )}

      {/* Upload Section (Admin Only) */}
      {isAdmin && (
        <div className="bg-white/40 backdrop-blur-md p-8 rounded-[32px] border-2 border-[#B2AC88]/20 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Upload className="text-[#8B4513]" size={20} />
            <h3 className="text-lg font-serif font-bold text-leather">Archive New Material</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60 ml-1">Resource Title</label>
              <input 
                type="text"
                placeholder="e.g. Laxmikanth Polity Summary"
                value={newResource.title}
                onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                className="w-full bg-[#F5F2E7]/50 border border-[#B2AC88]/30 rounded-xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37] transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60 ml-1">Category</label>
              <select 
                value={newResource.category}
                onChange={(e) => setNewResource({...newResource, category: e.target.value})}
                className="w-full bg-[#F5F2E7]/50 border border-[#B2AC88]/30 rounded-xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37] transition-all"
              >
                <option value="General">General</option>
                <option value="NCERT">NCERT</option>
                <option value="Standard">Standard Book</option>
                <option value="Current Affairs">Current Affairs</option>
                <option value="Notes">Personal Notes</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60 ml-1">Type</label>
              <select 
                value={newResource.type}
                onChange={(e) => setNewResource({...newResource, type: e.target.value as any})}
                className="w-full bg-[#F5F2E7]/50 border border-[#B2AC88]/30 rounded-xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37] transition-all"
              >
                <option value="pdf">PDF Document</option>
                <option value="video">Video Lecture</option>
                <option value="link">External Link</option>
              </select>
            </div>

            <div className="space-y-2">
              {newResource.type === 'link' ? (
                <>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60 ml-1">Resource URL</label>
                  <input 
                    type="url"
                    placeholder="https://..."
                    value={newResource.externalUrl}
                    onChange={(e) => setNewResource({...newResource, externalUrl: e.target.value})}
                    className="w-full bg-[#F5F2E7]/50 border border-[#B2AC88]/30 rounded-xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37] transition-all"
                  />
                </>
              ) : (
                <>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60 ml-1">Select File</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-[#F5F2E7]/50 border-2 border-dashed border-[#B2AC88]/40 rounded-xl py-2.5 px-4 flex items-center gap-2 cursor-pointer hover:bg-white/50 transition-all"
                  >
                    <File size={16} className="text-[#8B4513]/40" />
                    <span className="text-xs font-serif text-[#8B4513]/60 truncate">
                      {newResource.file ? newResource.file.name : 'Choose file...'}
                    </span>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={(e) => setNewResource({...newResource, file: e.target.files?.[0] || null})}
                      className="hidden" 
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button 
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-[#8B4513] hover:bg-[#1A1612] text-[#F5F2E7] rounded-xl px-10 py-6 shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#F5F2E7]/30 border-t-[#F5F2E7] rounded-full animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Publish to Hub
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Modern Filter Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {['All', 'pdf', 'link', 'video'].map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeType === type 
                  ? 'bg-[#8B4513] text-[#F5F2E7] shadow-lg' 
                  : 'bg-white/60 text-[#8B4513] border border-[#B2AC88]/20 hover:bg-[#F5F2E7]'
              }`}
            >
              {type === 'All' ? 'Every Scroll' : type === 'pdf' ? 'PDF Archives' : type === 'link' ? 'Web Links' : 'Video Lectures'}
            </button>
          ))}
        </div>
        
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B4513]/40" size={18} />
          <input 
            type="text"
            placeholder="Search within the Imperial Repository..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 backdrop-blur-sm border-2 border-[#B2AC88]/20 rounded-2xl py-3.5 pl-12 pr-4 font-serif outline-none focus:border-[#D4AF37] shadow-sm"
          />
        </div>
      </div>

      {/* Resource Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[400px]">
        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredResources.map((res) => (
                <motion.div
                  key={res.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white p-6 rounded-[32px] border-2 border-saddle-brown/10 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-parchment rounded-2xl text-saddle-brown group-hover:bg-antique-gold group-hover:text-leather transition-colors">
                      {res.type === 'pdf' ? <FileText size={24} /> : res.type === 'video' ? <Video size={24} /> : <ExternalLink size={24} />}
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => setConfirmDelete(res.id)} 
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-2 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  
                  <h4 className="font-serif font-bold text-leather mb-2 line-clamp-2 h-12">{res.title}</h4>
                  
                  <div className="flex flex-col gap-3 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-saddle-brown/5 flex items-center justify-center">
                        <UserIcon size={12} className="text-saddle-brown/40" />
                      </div>
                      <span className="text-[10px] font-bold text-saddle-brown/60 uppercase tracking-widest truncate">
                        {res.uploader_name}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-saddle-brown/5 flex items-center justify-center">
                        <Clock size={12} className="text-saddle-brown/40" />
                      </div>
                      <span className="text-[10px] text-saddle-brown/40 uppercase tracking-widest">
                        {res.timestamp?.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) || 'Recently'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-saddle-brown/5">
                    <span className="px-3 py-1 bg-parchment rounded-full text-[9px] font-bold text-saddle-brown uppercase tracking-widest">
                      {res.category}
                    </span>
                    <a 
                      href={res.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => recordView(res)}
                      className="flex items-center gap-2 px-4 py-2 bg-antique-gold text-leather rounded-xl hover:bg-saddle-brown hover:text-parchment transition-all shadow-sm font-bold text-xs"
                    >
                      {res.type === 'pdf' ? <Download size={14} /> : <ExternalLink size={14} />}
                      {res.type === 'pdf' ? 'Download' : 'View'}
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-[40px] border-2 border-dashed border-saddle-brown/10">
            <div className="w-20 h-20 bg-parchment rounded-full flex items-center justify-center mb-6 text-saddle-brown/20">
              <AlertCircle size={40} />
            </div>
            <h3 className="font-serif text-2xl font-bold text-saddle-brown/40">No Resources Available</h3>
            <p className="text-sm font-serif italic text-saddle-brown/20 mt-2">The Imperial Hub is currently awaiting new scholarly contributions.</p>
            {isAdmin && (
              <Button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                variant="ghost" 
                className="mt-6 text-saddle-brown hover:text-leather font-bold"
              >
                Be the first to contribute
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
