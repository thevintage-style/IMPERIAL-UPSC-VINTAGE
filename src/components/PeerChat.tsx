import React, { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { 
  UserPlus, 
  Check, 
  X, 
  Ban, 
  MessageCircle, 
  User as UserIcon,
  ShieldCheck,
  Search,
  Send,
  ArrowLeft,
  AlertTriangle,
  Paperclip,
  FileText,
  Link as LinkIcon,
  Square,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { ReportModal } from './ReportModal';

interface ChatUser {
  id: string;
  display_name: string;
  email: string;
  role: string;
  photo_url?: string;
}

interface PeerMessage {
  id: string;
  text: string;
  sender_id: string;
  receiver_id: string;
  attachment_type?: 'pdf' | 'link' | 'community_post_id';
  attachment_url?: string;
  created_at: string;
}

interface PeerChatProps {
  user: SupabaseUser;
}

export function PeerChat({ user }: PeerChatProps) {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<PeerMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [attachmentType, setAttachmentType] = useState<'pdf' | 'link' | 'community_post_id' | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    // Fetch blocked users
    const fetchBlocked = async () => {
      const { data } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);
      
      if (data) setBlockedUserIds(data.map(b => b.blocked_id));
    };

    // Fetch all users from public_profiles
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('public_profiles')
        .select('*');
      
      if (data) {
        const allUsers = data
          .filter(u => u.id !== user.id)
          .sort((a, b) => {
            if (a.id === 'admin_01' || a.role === 'admin') return -1;
            if (b.id === 'admin_01' || b.role === 'admin') return 1;
            return (a.display_name || '').localeCompare(b.display_name || '');
          });
        setUsers(allUsers);
      }
    };

    // Fetch chat requests
    const fetchRequests = async () => {
      const { data } = await supabase
        .from('chat_requests')
        .select('*')
        .eq('to_id', user.id);
      
      if (data) setRequests(data);
    };

    fetchBlocked();
    fetchUsers();
    fetchRequests();

    // Subscribe to requests
    const requestsChannel = supabase
      .channel('chat-requests')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_requests',
        filter: `to_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRequests(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
    };
  }, [user.id]);

  // Supabase Realtime Messages
  useEffect(() => {
    if (!selectedUser) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('peer_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data) {
        setMessages(data);
      }
    };

    fetchMessages();

    // Subscribe to changes
    const channel = supabase
      .channel(`chat:${selectedUser.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'peer_messages' 
      }, (payload) => {
        const newMsg = payload.new as PeerMessage;
        if (
          (newMsg.sender_id === user.id && newMsg.receiver_id === selectedUser.id) ||
          (newMsg.sender_id === selectedUser.id && newMsg.receiver_id === user.id)
        ) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser, user.id]);

  const sendRequest = async (targetId: string) => {
    try {
      await supabase.from('chat_requests').insert({
        from_id: user.id,
        from_name: user.user_metadata?.full_name || user.email,
        to_id: targetId,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      alert("Scholarly request dispatched. Wait for their acceptance.");
    } catch (error) {
      console.error("Error sending request:", error);
    }
  };

  const handleRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await supabase
        .from('chat_requests')
        .update({ status })
        .eq('id', requestId);
    } catch (error) {
      console.error("Error handling request:", error);
    }
  };

  const sendMessage = async () => {
    if ((!inputText.trim() && !attachmentType) || !selectedUser) return;
    
    try {
      const { error } = await supabase.from('peer_messages').insert({
        text: inputText,
        sender_id: user.id,
        receiver_id: selectedUser.id,
        attachment_type: attachmentType,
        attachment_url: attachmentUrl,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      
      setInputText('');
      setAttachmentType(null);
      setAttachmentUrl('');
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to deliver your correspondence. Check the archival link.");
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    if (confirm(`Are you sure you wish to banish ${selectedUser.display_name} from your scholarly circle?`)) {
      try {
        await supabase.from('blocked_users').insert({
          blocker_id: user.id,
          blocked_id: selectedUser.id,
          created_at: new Date().toISOString()
        });
        setSelectedUser(null);
        alert("The scholar has been banished from your view.");
      } catch (error) {
        console.error("Error blocking user:", error);
      }
    }
  };

  const filteredUsers = users.filter(u => 
    !blockedUserIds.includes(u.id) &&
    (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex bg-white rounded-3xl border-2 border-saddle-brown/20 overflow-hidden shadow-2xl">
      {/* Sidebar: User List */}
      <div className={`w-full md:w-80 border-r border-saddle-brown/10 flex flex-col bg-parchment/30 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-saddle-brown/10 space-y-4">
          <h3 className="font-serif font-bold text-saddle-brown flex items-center gap-2 text-lg">
            <MessageCircle size={24} className="text-antique-gold" />
            Peer Network
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-saddle-brown/40" size={16} />
            <input 
              type="text"
              placeholder="Search scholars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-saddle-brown/10 rounded-xl py-2.5 pl-10 pr-4 text-sm font-serif outline-none focus:border-antique-gold shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Incoming Requests */}
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <div className="p-4 bg-antique-gold/5 border-b border-saddle-brown/10">
              <p className="text-[10px] font-bold text-saddle-brown uppercase tracking-widest mb-3 flex items-center gap-2">
                <UserPlus size={12} /> Pending Requests
              </p>
              <div className="space-y-2">
                {requests.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="bg-white p-3 rounded-xl border border-saddle-brown/10 flex items-center justify-between shadow-sm">
                    <span className="text-xs font-serif font-bold truncate">{req.from_name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleRequest(req.id, 'accepted')} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                        <Check size={14} />
                      </button>
                      <button onClick={() => handleRequest(req.id, 'rejected')} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                         <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User List */}
          <div className="p-2 space-y-1">
            {filteredUsers.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  selectedUser?.id === u.id 
                    ? 'bg-saddle-brown text-parchment shadow-lg scale-[0.98]' 
                    : 'hover:bg-saddle-brown/5 text-leather'
                }`}
              >
                <div className="relative">
                  {u.photo_url ? (
                    <img src={u.photo_url} alt={u.display_name} className="w-10 h-10 rounded-full border-2 border-antique-gold/20" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-saddle-brown/10 flex items-center justify-center border-2 border-antique-gold/20">
                      <UserIcon size={20} className="text-saddle-brown" />
                    </div>
                  )}
                  {(u.id === 'admin_01' || u.role === 'admin') && (
                    <div className="absolute -top-1 -right-1 bg-antique-gold text-leather p-0.5 rounded-full border border-white shadow-sm">
                      <ShieldCheck size={12} />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-serif font-bold truncate">{u.display_name}</p>
                  <p className={`text-[10px] uppercase tracking-widest opacity-60 ${u.role === 'admin' ? 'text-antique-gold font-bold' : ''}`}>
                    {u.id === 'admin_01' || u.role === 'admin' ? 'Imperial Admin' : 'Scholar'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
        {selectedUser ? (
          <>
            <div className="p-6 border-b border-saddle-brown/10 flex items-center justify-between bg-parchment/10 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 hover:bg-saddle-brown/5 rounded-full">
                  <ArrowLeft size={20} />
                </button>
                <div className="relative">
                  <h4 className="font-serif font-bold text-saddle-brown text-lg">{selectedUser.display_name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[10px] text-saddle-brown/40 uppercase tracking-widest font-bold">In the Library</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsReportModalOpen(true)}
                  className="text-orange-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl"
                >
                  <AlertTriangle size={20} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleBlockUser}
                  className="text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                >
                  <Ban size={20} />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]">
              {messages.map(msg => {
                const isOwn = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 mb-1 px-2`}>
                      <span className="text-[10px] font-bold text-saddle-brown/60 uppercase tracking-widest">
                        {isOwn ? 'Your Excellency' : selectedUser.display_name}
                      </span>
                      <span className="text-[8px] text-saddle-brown/40">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`max-w-[75%] p-4 rounded-3xl shadow-md border ${
                      isOwn 
                        ? 'bg-saddle-brown text-parchment border-saddle-brown/20 rounded-tr-none' 
                        : 'bg-white text-leather border-saddle-brown/10 rounded-tl-none'
                    }`}>
                      {msg.attachment_type && (
                        <div className={`mb-3 p-3 rounded-xl flex items-center gap-3 border ${isOwn ? 'bg-white/10 border-white/20' : 'bg-parchment/30 border-saddle-brown/10'}`}>
                          {msg.attachment_type === 'pdf' && <FileText className="text-antique-gold" size={24} />}
                          {msg.attachment_type === 'link' && <LinkIcon className="text-blue-400" size={24} />}
                          {msg.attachment_type === 'community_post_id' && <Square className="text-green-400" size={24} />}
                          <div className="flex-1 overflow-hidden">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                              {msg.attachment_type.replace('_', ' ')}
                            </p>
                            <p className="text-xs truncate italic">{msg.attachment_url}</p>
                          </div>
                          <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-black/5 rounded-lg">
                            <ArrowLeft className="rotate-180" size={16} />
                          </a>
                        </div>
                      )}
                      <p className="text-sm font-serif leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-saddle-brown/10 bg-parchment/10">
              {attachmentType && (
                <div className="mb-4 p-3 bg-antique-gold/10 border border-antique-gold/20 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {attachmentType === 'pdf' && <FileText size={20} className="text-antique-gold" />}
                    {attachmentType === 'link' && <LinkIcon size={20} className="text-blue-400" />}
                    {attachmentType === 'community_post_id' && <Square size={20} className="text-green-400" />}
                    <input 
                      type="text"
                      placeholder={`Enter ${attachmentType.replace('_', ' ')} link...`}
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs font-serif w-64"
                    />
                  </div>
                  <button onClick={() => {setAttachmentType(null); setAttachmentUrl('');}} className="p-1 hover:bg-black/5 rounded-full">
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex flex-col gap-1">
                   <button 
                    onClick={() => setAttachmentType(attachmentType === 'pdf' ? null : 'pdf')}
                    className={`p-3 rounded-xl transition-all ${attachmentType === 'pdf' ? 'bg-antique-gold text-leather' : 'bg-white hover:bg-parchment text-saddle-brown border border-saddle-brown/10'}`}
                  >
                    <Paperclip size={20} />
                  </button>
                </div>
                {attachmentType === null && (
                  <div className="flex gap-1 absolute bottom-24 bg-white p-2 rounded-2xl border border-saddle-brown/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setAttachmentType('pdf')} className="p-2 hover:bg-parchment rounded-lg flex flex-col items-center gap-1">
                      <FileText size={20} />
                      <span className="text-[8px]">PDF</span>
                    </button>
                    <button onClick={() => setAttachmentType('link')} className="p-2 hover:bg-parchment rounded-lg flex flex-col items-center gap-1">
                      <LinkIcon size={20} />
                      <span className="text-[8px]">Link</span>
                    </button>
                    <button onClick={() => setAttachmentType('community_post_id')} className="p-2 hover:bg-parchment rounded-lg flex flex-col items-center gap-1">
                      <Square size={20} />
                      <span className="text-[8px]">Post</span>
                    </button>
                  </div>
                )}
                
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    placeholder="Draft a scholarly message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    className="w-full bg-white border border-saddle-brown/10 rounded-2xl py-4 px-6 font-serif text-sm outline-none focus:border-antique-gold shadow-sm transition-all focus:shadow-md"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                    <button onClick={() => setAttachmentType(attachmentType ? null : 'pdf')} className="p-2 text-saddle-brown/40 hover:text-antique-gold transition-colors">
                      <Paperclip size={18} />
                    </button>
                  </div>
                </div>
                <Button onClick={sendMessage} className="bg-saddle-brown hover:bg-leather text-parchment rounded-2xl px-8 shadow-lg transition-all hover:scale-105 active:scale-95 group">
                  <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-saddle-brown/20 p-12 text-center animate-out fade-out">
            <div className="w-32 h-32 rounded-full border-4 border-current flex items-center justify-center mb-8 relative">
              <MessageCircle size={64} />
              <div className="absolute -top-2 -right-2 bg-antique-gold text-white p-3 rounded-full animate-bounce shadow-xl">
                <Sparkles size={24} />
              </div>
            </div>
            <h3 className="font-serif text-3xl font-bold mb-4 text-saddle-brown">The Silent Archives</h3>
            <p className="text-base font-serif italic max-w-sm text-saddle-brown/60 leading-relaxed">
              "Words are the threads of civilization. Select a fellow scholar and begin weaving your intellectual legacy."
            </p>
          </div>
        )}
      </div>

      {selectedUser && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reporterId={user.id}
          reportedId={selectedUser.id}
          reportedName={selectedUser.display_name}
          context="Peer Chat"
        />
      )}
    </div>
  );
}
