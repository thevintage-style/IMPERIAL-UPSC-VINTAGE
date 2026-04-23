import React, { useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Folder as FolderIcon, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  MapPin,
  Plus, 
  Trash2, 
  Edit3,
  Save,
  File,
  Search,
  FolderPlus,
  ArrowRight,
  X,
  RefreshCw,
  Upload
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface VaultItem {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'link' | 'note' | 'map_marker';
  url?: string;
  content?: string;
  folderId: string | null;
  createdAt: any;
}

interface VaultFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: any;
}

interface PersonalVaultProps {
  user: FirebaseUser | SupabaseUser;
}

export function PersonalVault({ user }: PersonalVaultProps) {
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'pdf' | 'link' | 'note'>('all');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<{title: string, type: 'video' | 'pdf' | 'link' | 'note', url: string, content: string}>({ title: '', type: 'link', url: '', content: '' });
  const [editingNote, setEditingNote] = useState<VaultItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<VaultFolder | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{id: string, type: 'item' | 'folder'} | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const userId = (user as any).uid || (user as any).id;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${userId}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('vault')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('vault')
        .getPublicUrl(filePath);

      // Save metadata to Firestore (or Supabase)
      await addDoc(collection(db, `users/${userId}/notes`), {
        title: file.name,
        type: file.type.includes('pdf') ? 'pdf' : file.type.includes('video') ? 'video' : 'pdf',
        url: publicUrl,
        userId,
        folderId: currentFolderId,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Upload Error:', error);
      alert('Failed to upload to the Imperial Vault.');
    } finally {
      setIsUploading(false);
    }
  };

  // Real-time Folders
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, `users/${userId}/folders`),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaultFolder)));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/folders`);
    });
    return () => unsubscribe();
  }, [userId]);

  // Real-time Items (Notes & Resources)
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, `users/${userId}/notes`),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaultItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/notes`);
    });
    return () => unsubscribe();
  }, [userId]);

  const handleCreateFolder = async () => {
    if (!newFolderName || !userId) return;
    try {
      await addDoc(collection(db, `users/${userId}/folders`), {
        name: newFolderName,
        userId,
        parentId: newFolderParentId,
        createdAt: serverTimestamp()
      });
      setIsAddingFolder(false);
      setNewFolderName('');
      setNewFolderParentId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}/folders`);
    }
  };

  const handleRenameFolder = async () => {
    if (!renamingFolder || !renamingFolder.name || !userId) return;
    try {
      await updateDoc(doc(db, `users/${userId}/folders`, renamingFolder.id), {
        name: renamingFolder.name
      });
      setRenamingFolder(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/folders`);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.title || !userId) return;
    try {
      await addDoc(collection(db, `users/${userId}/notes`), {
        ...newItem,
        userId,
        folderId: currentFolderId,
        createdAt: serverTimestamp()
      });
      setIsAddingItem(false);
      setNewItem({ title: '', type: 'link', url: '', content: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}/notes`);
    }
  };

  const handleDeleteItem = async (id: string, type: 'item' | 'folder') => {
    if (!userId) return;
    try {
      if (type === 'item') {
        await deleteDoc(doc(db, `users/${userId}/notes`, id));
      } else {
        // Recursive delete would be better, but for now just the folder
        await deleteDoc(doc(db, `users/${userId}/folders`, id));
      }
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/${type === 'item' ? 'notes' : 'folders'}`);
    }
  };

  const handleSaveNote = async () => {
    if (!editingNote || !userId) return;
    try {
      await updateDoc(doc(db, `users/${userId}/notes`, editingNote.id), {
        content: editingNote.content,
        title: editingNote.title
      });
      setEditingNote(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/notes`);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesFolder = item.folderId === currentFolderId;
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesTab && matchesSearch;
  });

  const currentFolders = folders.filter(f => f.parentId === currentFolderId);

  const breadcrumbs = (() => {
    const crumbs: { id: string | null, name: string }[] = [{ id: null, name: 'Root Vault' }];
    if (!currentFolderId) return crumbs;

    const path: { id: string | null, name: string }[] = [];
    let curr = folderIdToObj(currentFolderId);
    while (curr) {
      path.unshift({ id: curr.id, name: curr.name });
      curr = curr.parentId ? folderIdToObj(curr.parentId) : null;
    }
    return [...crumbs, ...path];
  })();

  function folderIdToObj(id: string) {
    return folders.find(f => f.id === id);
  }

  const FolderTree = ({ parentId, level = 0 }: { parentId: string | null, level?: number }) => {
    const childFolders = folders.filter(f => f.parentId === parentId);
    return (
      <div className="flex flex-col">
        {childFolders.map(folder => (
          <div key={folder.id} className="flex flex-col">
            <div 
              className={`flex items-center gap-2 py-2 px-3 rounded-xl cursor-pointer transition-all group ${currentFolderId === folder.id ? 'bg-[#8B4513] text-white shadow-lg' : 'hover:bg-[#8B4513]/5 text-[#8B4513]'}`}
              style={{ paddingLeft: `${level * 16 + 12}px` }}
              onClick={() => setCurrentFolderId(folder.id)}
            >
              <FolderIcon size={16} className={currentFolderId === folder.id ? 'text-white' : 'text-[#D4AF37]'} />
              <span className="text-sm font-serif truncate flex-1">{folder.name}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); setRenamingFolder(folder); }} className="p-1 hover:bg-white/20 rounded"><Edit3 size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({id: folder.id, type: 'folder'}); }} className="p-1 hover:bg-white/20 rounded text-red-400"><Trash2 size={12} /></button>
              </div>
            </div>
            <FolderTree parentId={folder.id} level={level + 1} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex gap-8 overflow-hidden">
      {/* Sidebar: Folder Hierarchy */}
      <div className="w-72 bg-white rounded-[40px] border-2 border-[#8B4513]/10 shadow-xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-[#8B4513]/5 flex items-center justify-between">
          <h3 className="font-serif font-bold text-[#8B4513] uppercase tracking-widest text-xs">Scholarly Archives</h3>
          <button onClick={() => setIsAddingFolder(true)} className="p-2 bg-[#8B4513]/5 text-[#8B4513] hover:bg-[#8B4513]/10 rounded-xl transition-all"><FolderPlus size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div 
            className={`flex items-center gap-2 py-3 px-4 rounded-2xl cursor-pointer transition-all mb-4 ${!currentFolderId ? 'bg-[#8B4513] text-white shadow-lg' : 'hover:bg-[#8B4513]/5 text-[#8B4513]'}`}
            onClick={() => setCurrentFolderId(null)}
          >
            <FolderIcon size={20} />
            <span className="font-serif font-bold">Root Vault</span>
          </div>
          <FolderTree parentId={null} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
        {/* Modals */}
        <AnimatePresence>
          {confirmDelete && (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-[32px] border-2 border-red-100 shadow-2xl max-w-sm w-full text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="text-red-500" size={32} /></div>
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Delete {confirmDelete.type === 'folder' ? 'Folder' : 'Resource'}?</h3>
                <p className="text-sm text-gray-500 font-serif italic mb-8">This action cannot be undone. All contents will be permanently removed.</p>
                <div className="flex gap-3">
                  <Button onClick={() => setConfirmDelete(null)} variant="ghost" className="flex-1 rounded-xl">Cancel</Button>
                  <Button onClick={() => handleDeleteItem(confirmDelete.id, confirmDelete.type)} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl">Delete</Button>
                </div>
              </motion.div>
            </div>
          )}

          {isAddingFolder && (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#F5F2E7] p-8 rounded-[32px] border-4 border-[#8B4513] shadow-2xl max-w-sm w-full">
                <h3 className="text-xl font-serif font-bold text-[#8B4513] mb-6 text-center">Establish New Archive</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60 mb-2 block text-center">Folder Name</label>
                    <input type="text" autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} className="w-full bg-white border-2 border-[#8B4513]/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37]" placeholder="Manuscript Title..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60 mb-2 block text-center">Parent Registry</label>
                    <select 
                      value={newFolderParentId || ''} 
                      onChange={(e) => setNewFolderParentId(e.target.value || null)}
                      className="w-full bg-white border-2 border-[#8B4513]/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37] appearance-none"
                    >
                      <option value="">Root Vault</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <Button onClick={() => setIsAddingFolder(false)} variant="ghost" className="flex-1">Discard</Button>
                  <Button onClick={handleCreateFolder} className="flex-1 bg-[#8B4513] text-white">Consign</Button>
                </div>
              </motion.div>
            </div>
          )}

          {renamingFolder && (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#F5F2E7] p-8 rounded-[32px] border-4 border-[#8B4513] shadow-2xl max-w-sm w-full">
                <h3 className="text-xl font-serif font-bold text-[#8B4513] mb-6">Rename Folder</h3>
                <input type="text" autoFocus value={renamingFolder.name} onChange={(e) => setRenamingFolder({...renamingFolder, name: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()} className="w-full bg-white border-2 border-[#8B4513]/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37] mb-6" />
                <div className="flex gap-3">
                  <Button onClick={() => setRenamingFolder(null)} variant="ghost" className="flex-1">Cancel</Button>
                  <Button onClick={handleRenameFolder} className="flex-1 bg-[#8B4513] text-white">Update</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Header & Controls */}
        <div className="flex flex-col gap-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[#8B4513]/60 text-xs font-serif overflow-x-auto whitespace-nowrap pb-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <button 
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={`hover:text-[#D4AF37] transition-colors ${idx === breadcrumbs.length - 1 ? 'font-bold text-[#8B4513]' : ''}`}
                >
                  {crumb.name}
                </button>
                {idx < breadcrumbs.length - 1 && <span className="text-[10px]">/</span>}
              </React.Fragment>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B4513]/40" size={16} />
                <input type="text" placeholder="Search archives..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border-2 border-[#8B4513]/10 rounded-xl py-2 pl-10 pr-4 text-xs font-serif outline-none focus:border-[#D4AF37]" />
              </div>
              <div className="flex bg-white border-2 border-[#8B4513]/10 rounded-xl p-1">
                {(['all', 'video', 'pdf', 'link', 'note'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[#8B4513] text-[#F5F2E7] shadow-md' : 'text-[#8B4513]/40 hover:text-[#8B4513]'}`}>{tab}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <label className="bg-[#8B4513]/5 hover:bg-[#8B4513]/10 text-[#8B4513] rounded-xl flex items-center gap-2 px-6 py-2 cursor-pointer transition-all">
                <Upload size={18} />
                <span className="font-bold text-sm">{isUploading ? 'Sealing...' : 'Upload File'}</span>
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
              </label>
              <Button onClick={() => setIsAddingItem(true)} className="bg-[#8B4513] hover:bg-[#1A1612] text-[#F5F2E7] rounded-xl flex items-center gap-2 px-6"><Plus size={18} /> Add Meta</Button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 opacity-20"><RefreshCw className="animate-spin" size={48} /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Folders in Current View */}
              {currentFolders.map(folder => (
                <motion.div key={folder.id} whileHover={{ scale: 1.02 }} className="bg-white p-6 rounded-[32px] border-2 border-[#8B4513]/10 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative" onClick={() => setCurrentFolderId(folder.id)}>
                  <FolderIcon className="text-[#D4AF37] mb-4" size={48} fill="currentColor" fillOpacity={0.1} />
                  <p className="font-serif font-bold text-[#1A1612] truncate mb-1">{folder.name}</p>
                  <p className="text-[10px] text-[#8B4513]/40 uppercase tracking-widest">Folder</p>
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setRenamingFolder(folder); }} className="p-2 hover:bg-[#F5F2E7] rounded-full text-[#8B4513]/40 hover:text-[#8B4513]"><Edit3 size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({id: folder.id, type: 'folder'}); }} className="p-2 hover:bg-red-50 rounded-full text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </motion.div>
              ))}

              {/* Items */}
              {filteredItems.map(item => (
                <motion.div key={item.id} whileHover={{ scale: 1.02 }} className="bg-white p-6 rounded-[32px] border-2 border-[#8B4513]/10 shadow-sm hover:shadow-xl transition-all group relative">
                  <div className="text-[#8B4513] mb-4">
                    {item.type === 'video' && <Video size={40} />}
                    {item.type === 'pdf' && <File size={40} />}
                    {item.type === 'link' && <LinkIcon size={40} />}
                    {item.type === 'note' && <FileText size={40} />}
                    {item.type === 'map_marker' && <MapPin size={40} />}
                  </div>
                  <p className="font-serif font-bold text-[#1A1612] truncate mb-1">{item.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#8B4513]/40 uppercase tracking-widest">{item.type}</span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:text-[#8B4513] transition-colors"><ArrowRight size={16} /></a>
                    )}
                  </div>
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(item.type === 'note' || item.type === 'map_marker') && <button onClick={() => setEditingNote(item)} className="p-2 hover:bg-[#F5F2E7] rounded-full text-[#8B4513]/40 hover:text-[#8B4513]"><Edit3 size={14} /></button>}
                    <button onClick={() => setConfirmDelete({id: item.id, type: 'item'})} className="p-2 hover:bg-red-50 rounded-full text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAddingItem && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#1A1612]/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#F5F2E7] w-full max-w-md rounded-[40px] border-4 border-[#8B4513] shadow-2xl p-10">
              <h3 className="text-2xl font-serif font-bold text-[#8B4513] mb-8">Add Resource</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60">Title</label>
                  <input type="text" value={newItem.title} onChange={(e) => setNewItem({...newItem, title: e.target.value})} className="w-full bg-white border-2 border-[#8B4513]/10 rounded-2xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60">Type</label>
                  <select value={newItem.type} onChange={(e) => setNewItem({...newItem, type: e.target.value as any})} className="w-full bg-white border-2 border-[#8B4513]/10 rounded-2xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37]">
                    <option value="link">YouTube / Web Link</option>
                    <option value="pdf">PDF Document</option>
                    <option value="video">Video File</option>
                    <option value="note">Scholarly Note</option>
                  </select>
                </div>
                {newItem.type !== 'note' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60">URL</label>
                    <input type="url" value={newItem.url} onChange={(e) => setNewItem({...newItem, url: e.target.value})} className="w-full bg-white border-2 border-[#8B4513]/10 rounded-2xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37]" />
                  </div>
                )}
                {newItem.type === 'note' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60">Content (Markdown)</label>
                    <textarea rows={4} value={newItem.content} onChange={(e) => setNewItem({...newItem, content: e.target.value})} className="w-full bg-white border-2 border-[#8B4513]/10 rounded-2xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37] resize-none" />
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-10">
                <Button onClick={() => setIsAddingItem(false)} variant="ghost" className="flex-1">Cancel</Button>
                <Button onClick={handleAddItem} className="flex-1 bg-[#8B4513] text-white">Add to Vault</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note Editor Modal */}
      <AnimatePresence>
        {editingNote && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#1A1612]/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#F5F2E7] w-full max-w-5xl h-[85vh] rounded-[48px] border-4 border-[#8B4513] shadow-2xl flex flex-col overflow-hidden">
              <div className="p-8 border-b border-[#8B4513]/10 flex items-center justify-between bg-white/50">
                <input type="text" value={editingNote.title} onChange={(e) => setEditingNote({...editingNote, title: e.target.value})} className="bg-transparent text-3xl font-serif font-bold text-[#8B4513] outline-none flex-1" />
                <div className="flex gap-3">
                  <Button onClick={handleSaveNote} className="bg-[#8B4513] text-white rounded-2xl px-8"><Save size={18} className="mr-2" /> Save Manuscript</Button>
                  <Button onClick={() => setEditingNote(null)} variant="ghost" className="rounded-2xl"><X size={20} /></Button>
                </div>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 p-10 border-r border-[#8B4513]/10 flex flex-col">
                  <p className="text-[10px] font-bold text-[#8B4513]/40 uppercase tracking-widest mb-4">Scribe Area</p>
                  <textarea value={editingNote.content} onChange={(e) => setEditingNote({...editingNote, content: e.target.value})} className="flex-1 bg-transparent font-serif text-xl text-[#1A1612] outline-none resize-none leading-relaxed custom-scrollbar" placeholder="Write your scholarly insights here..." />
                </div>
                <div className="flex-1 p-10 bg-white/30 overflow-y-auto custom-scrollbar">
                  <p className="text-[10px] font-bold text-[#8B4513]/40 uppercase tracking-widest mb-4">Illuminated Preview</p>
                  <div className="prose prose-saddle max-w-none font-serif text-[#1A1612]">
                    <ReactMarkdown>{editingNote.content || ''}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
