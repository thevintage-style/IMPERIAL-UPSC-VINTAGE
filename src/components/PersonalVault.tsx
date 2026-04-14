import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { 
  Folder, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  MoreVertical,
  Edit3,
  Save,
  Youtube,
  File,
  Search,
  Clock
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface VaultItem {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'link' | 'note';
  url?: string;
  content?: string;
  folder_id: string | null;
  created_at: string;
}

interface VaultFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
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

  const userId = (user as any).uid || (user as any).id;

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: foldersData, error: foldersError } = await supabase
          .from('vault_folders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (foldersError) throw foldersError;
        setFolders(foldersData || []);

        const { data: itemsData, error: itemsError } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (itemsError) throw itemsError;
        setItems(itemsData || []);
      } catch (error) {
        console.error("Error fetching vault data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscriptions
    const foldersSubscription = supabase
      .channel('vault_folders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vault_folders', filter: `user_id=eq.${userId}` }, fetchData)
      .subscribe();

    const itemsSubscription = supabase
      .channel('notes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(foldersSubscription);
      supabase.removeChannel(itemsSubscription);
    };
  }, [userId]);

  const handleCreateFolder = async () => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    try {
      const { error } = await supabase
        .from('vault_folders')
        .insert([{
          name,
          user_id: userId,
          parent_id: currentFolderId
        }]);
      if (error) throw error;
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.title) return;
    try {
      const { error } = await supabase
        .from('notes')
        .insert([{
          ...newItem,
          user_id: userId,
          folder_id: currentFolderId
        }]);
      if (error) throw error;
      setIsAddingItem(false);
      setNewItem({ title: '', type: 'link', url: '', content: '' });
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleDeleteItem = async (id: string, type: 'item' | 'folder') => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      if (type === 'item') {
        const { error } = await supabase.from('notes').delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vault_folders').delete().eq('id', id);
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleSaveNote = async () => {
    if (!editingNote) return;
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          content: editingNote.content,
          title: editingNote.title
        })
        .eq('id', editingNote.id);
      if (error) throw error;
      setEditingNote(null);
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesFolder = item.folder_id === currentFolderId;
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesTab && matchesSearch;
  });

  const currentFolders = folders.filter(f => f.parent_id === currentFolderId);
  const breadcrumbs = [];
  let tempId = currentFolderId;
  while (tempId) {
    const f = folders.find(folder => folder.id === tempId);
    if (f) {
      breadcrumbs.unshift(f);
      tempId = f.parent_id;
    } else break;
  }

  const getYoutubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-serif">
          <button 
            onClick={() => setCurrentFolderId(null)}
            className={`hover:text-[#8B4513] transition-colors ${!currentFolderId ? 'font-bold text-[#8B4513]' : 'text-[#8B4513]/60'}`}
          >
            Personal Vault
          </button>
          {breadcrumbs.map(bc => (
            <React.Fragment key={bc.id}>
              <ChevronRight size={14} className="text-[#8B4513]/40" />
              <button 
                onClick={() => setCurrentFolderId(bc.id)}
                className={`hover:text-[#8B4513] transition-colors ${currentFolderId === bc.id ? 'font-bold text-[#8B4513]' : 'text-[#8B4513]/60'}`}
              >
                {bc.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateFolder} variant="ghost" className="border-2 border-[#8B4513]/10 rounded-xl flex items-center gap-2 text-[#8B4513]">
            <Folder size={18} />
            New Folder
          </Button>
          <Button onClick={() => setIsAddingItem(true)} className="bg-[#8B4513] hover:bg-[#1A1612] text-[#F5F2E7] rounded-xl flex items-center gap-2">
            <Plus size={18} />
            Add Resource
          </Button>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B4513]/40" size={16} />
          <input 
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-2 border-[#8B4513]/10 rounded-xl py-2 pl-10 pr-4 text-xs font-serif outline-none focus:border-[#D4AF37]"
          />
        </div>
        <div className="flex bg-white border-2 border-[#8B4513]/10 rounded-xl p-1">
          {(['all', 'video', 'pdf', 'link', 'note'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-[#8B4513] text-[#F5F2E7] shadow-md' 
                  : 'text-[#8B4513]/40 hover:text-[#8B4513]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B4513]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Folders */}
            {currentFolders.map(folder => (
              <motion.div
                key={folder.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-4 rounded-2xl border-2 border-[#8B4513]/10 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Folder className="text-[#D4AF37]" size={32} fill="currentColor" fillOpacity={0.2} />
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(folder.id, 'folder'); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="font-serif font-bold text-[#1A1612] truncate">{folder.name}</p>
                <p className="text-[10px] text-[#8B4513]/40 uppercase tracking-widest">Folder</p>
              </motion.div>
            ))}

            {/* Items */}
            {filteredItems.map(item => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-4 rounded-2xl border-2 border-[#8B4513]/10 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[#8B4513]">
                    {item.type === 'video' && <Video size={32} />}
                    {item.type === 'pdf' && <File size={32} />}
                    {item.type === 'link' && <LinkIcon size={32} />}
                    {item.type === 'note' && <FileText size={32} />}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.type === 'note' && (
                      <button onClick={() => setEditingNote(item)} className="text-[#8B4513]/40 hover:text-[#8B4513]">
                        <Edit3 size={14} />
                      </button>
                    )}
                    <button onClick={() => handleDeleteItem(item.id, 'item')} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="font-serif font-bold text-[#1A1612] truncate">{item.title}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-[#8B4513]/40 uppercase tracking-widest">{item.type}</span>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:text-[#8B4513] transition-colors">
                      <Edit3 size={14} />
                    </a>
                  )}
                </div>
                
                {/* YouTube Preview */}
                {item.type === 'link' && item.url && getYoutubeEmbedUrl(item.url) && (
                  <div className="mt-4 aspect-video rounded-lg overflow-hidden border border-[#8B4513]/10">
                    <iframe 
                      src={getYoutubeEmbedUrl(item.url)!}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAddingItem && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#1A1612]/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F2E7] w-full max-w-md rounded-3xl border-4 border-[#8B4513] shadow-2xl p-8"
            >
              <h3 className="text-2xl font-serif font-bold text-[#8B4513] mb-6">Add Resource</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60">Title</label>
                  <input 
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                    className="w-full bg-white border-2 border-[#8B4513]/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60">Type</label>
                  <select 
                    value={newItem.type}
                    onChange={(e) => setNewItem({...newItem, type: e.target.value as any})}
                    className="w-full bg-white border-2 border-[#8B4513]/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37]"
                  >
                    <option value="link">YouTube / Web Link</option>
                    <option value="pdf">PDF Document</option>
                    <option value="video">Video File</option>
                    <option value="note">Scholarly Note</option>
                  </select>
                </div>
                {newItem.type !== 'note' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60">URL</label>
                    <input 
                      type="url"
                      value={newItem.url}
                      onChange={(e) => setNewItem({...newItem, url: e.target.value})}
                      className="w-full bg-white border-2 border-[#8B4513]/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                )}
                {newItem.type === 'note' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/60">Content (Markdown)</label>
                    <textarea 
                      rows={6}
                      value={newItem.content}
                      onChange={(e) => setNewItem({...newItem, content: e.target.value})}
                      className="w-full bg-white border-2 border-[#8B4513]/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-[#D4AF37] resize-none"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-8">
                <Button onClick={() => setIsAddingItem(false)} variant="ghost" className="flex-1 rounded-xl border-2 border-[#8B4513]/10 text-[#8B4513]">Cancel</Button>
                <Button onClick={handleAddItem} className="flex-1 bg-[#8B4513] hover:bg-[#1A1612] text-[#F5F2E7] rounded-xl">Add to Vault</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note Editor Modal */}
      <AnimatePresence>
        {editingNote && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#1A1612]/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F2E7] w-full max-w-4xl h-[80vh] rounded-3xl border-4 border-[#8B4513] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-[#8B4513]/10 flex items-center justify-between">
                <input 
                  type="text"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({...editingNote, title: e.target.value})}
                  className="bg-transparent text-2xl font-serif font-bold text-[#8B4513] outline-none"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveNote} className="bg-[#8B4513] hover:bg-[#1A1612] text-[#F5F2E7] rounded-xl flex items-center gap-2">
                    <Save size={18} />
                    Save Note
                  </Button>
                  <Button onClick={() => setEditingNote(null)} variant="ghost" className="rounded-xl border-2 border-[#8B4513]/10 text-[#8B4513]">Close</Button>
                </div>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 p-6 border-r border-[#8B4513]/10">
                  <p className="text-[10px] font-bold text-[#8B4513]/40 uppercase tracking-widest mb-2">Drafting Area</p>
                  <textarea 
                    value={editingNote.content}
                    onChange={(e) => setEditingNote({...editingNote, content: e.target.value})}
                    className="w-full h-full bg-transparent font-serif text-[#1A1612] outline-none resize-none leading-relaxed"
                    placeholder="Write your scholarly insights here..."
                  />
                </div>
                <div className="flex-1 p-6 bg-white/30 overflow-y-auto custom-scrollbar">
                  <p className="text-[10px] font-bold text-[#8B4513]/40 uppercase tracking-widest mb-2">Manuscript Preview</p>
                  <div className="prose prose-saddle max-w-none font-serif text-[#1A1612]">
                    <Markdown>{editingNote.content || ''}</Markdown>
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
