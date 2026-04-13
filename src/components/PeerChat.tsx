import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
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
  AlertTriangle
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { ReportModal } from './ReportModal';

interface ChatUser {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  photoURL?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'blocked';
}

interface PeerMessage {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  createdAt: any;
}

interface PeerChatProps {
  user: User;
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

  useEffect(() => {
    // Fetch blocked users
    const qBlocked = query(
      collection(db, 'blockedUsers'),
      where('blockerId', '==', user.uid)
    );
    const unsubscribeBlocked = onSnapshot(qBlocked, (snapshot) => {
      setBlockedUserIds(snapshot.docs.map(doc => doc.data().blockedId));
    });

    // Fetch all users
    const unsubscribeUsers = onSnapshot(collection(db, 'publicProfiles'), (snapshot) => {
      const allUsers = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as ChatUser))
        .filter(u => u.uid !== user.uid)
        .sort((a, b) => {
          if (a.role === 'admin') return -1;
          if (b.role === 'admin') return 1;
          return (a.displayName || '').localeCompare(b.displayName || '');
        });
      setUsers(allUsers);
    });

    // Fetch chat requests
    const qRequests = query(
      collection(db, 'chatRequests'),
      where('toId', '==', user.uid)
    );
    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRequests();
    };
  }, [user.uid]);

  useEffect(() => {
    if (!selectedUser) return;

    const q = query(
      collection(db, 'peerMessages'),
      where('senderId', 'in', [user.uid, selectedUser.uid]),
      where('receiverId', 'in', [user.uid, selectedUser.uid]),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PeerMessage)));
    });

    return () => unsubscribe();
  }, [selectedUser, user.uid]);

  const sendRequest = async (targetId: string) => {
    try {
      await addDoc(collection(db, 'chatRequests'), {
        fromId: user.uid,
        fromName: user.displayName,
        toId: targetId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert("Scholarly request dispatched. Wait for their acceptance.");
    } catch (error) {
      console.error("Error sending request:", error);
    }
  };

  const handleRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'chatRequests', requestId), { status });
    } catch (error) {
      console.error("Error handling request:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedUser) return;
    try {
      await addDoc(collection(db, 'peerMessages'), {
        text: inputText,
        senderId: user.uid,
        receiverId: selectedUser.uid,
        createdAt: serverTimestamp()
      });
      setInputText('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    if (confirm(`Are you sure you wish to banish ${selectedUser.displayName} from your scholarly circle?`)) {
      try {
        await addDoc(collection(db, 'blockedUsers'), {
          blockerId: user.uid,
          blockedId: selectedUser.uid,
          createdAt: serverTimestamp()
        });
        setSelectedUser(null);
        alert("The scholar has been banished from your view.");
      } catch (error) {
        console.error("Error blocking user:", error);
      }
    }
  };

  const filteredUsers = users.filter(u => 
    !blockedUserIds.includes(u.uid) &&
    (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex bg-white rounded-3xl border-2 border-saddle-brown/20 overflow-hidden shadow-2xl">
      {/* Sidebar: User List */}
      <div className={`w-full md:w-80 border-r border-saddle-brown/10 flex flex-col bg-parchment/30 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-saddle-brown/10 space-y-4">
          <h3 className="font-serif font-bold text-saddle-brown flex items-center gap-2">
            <MessageCircle size={20} />
            Peer Network
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-saddle-brown/40" size={16} />
            <input 
              type="text"
              placeholder="Search scholars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-saddle-brown/10 rounded-xl py-2 pl-10 pr-4 text-xs font-serif outline-none focus:border-antique-gold"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Incoming Requests */}
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <div className="p-4 bg-antique-gold/5 border-b border-saddle-brown/10">
              <p className="text-[10px] font-bold text-saddle-brown uppercase tracking-widest mb-3">Pending Requests</p>
              <div className="space-y-2">
                {requests.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="bg-white p-3 rounded-xl border border-saddle-brown/10 flex items-center justify-between">
                    <span className="text-xs font-serif font-bold truncate">{req.fromName}</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleRequest(req.id, 'accepted')} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                        <Check size={14} />
                      </button>
                      <button onClick={() => handleRequest(req.id, 'rejected')} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
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
                key={u.uid}
                onClick={() => setSelectedUser(u)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                  selectedUser?.uid === u.uid 
                    ? 'bg-saddle-brown text-parchment shadow-lg' 
                    : 'hover:bg-saddle-brown/5 text-leather'
                }`}
              >
                <div className="relative">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="w-10 h-10 rounded-full border-2 border-current" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-saddle-brown/10 flex items-center justify-center border-2 border-current">
                      <UserIcon size={20} />
                    </div>
                  )}
                  {u.role === 'admin' && (
                    <div className="absolute -top-1 -right-1 bg-antique-gold text-leather p-0.5 rounded-full border border-white">
                      <ShieldCheck size={10} />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-serif font-bold truncate">{u.displayName}</p>
                  <p className={`text-[10px] uppercase tracking-widest opacity-60 ${u.role === 'admin' ? 'text-antique-gold font-bold' : ''}`}>
                    {u.role === 'admin' ? 'Imperial Admin' : 'Scholar'}
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
            <div className="p-6 border-b border-saddle-brown/10 flex items-center justify-between bg-parchment/10">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 hover:bg-saddle-brown/5 rounded-full">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h4 className="font-serif font-bold text-saddle-brown">{selectedUser.displayName}</h4>
                  <p className="text-[10px] text-saddle-brown/40 uppercase tracking-widest">Active in the Archives</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsReportModalOpen(true)}
                  className="text-orange-400 hover:text-orange-500 hover:bg-orange-50"
                >
                  <AlertTriangle size={20} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleBlockUser}
                  className="text-red-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Ban size={20} />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]">
              {messages.map(msg => {
                const isOwn = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm border ${
                      isOwn 
                        ? 'bg-saddle-brown text-parchment border-saddle-brown/20 rounded-tr-none' 
                        : 'bg-parchment/50 text-leather border-saddle-brown/10 rounded-tl-none'
                    }`}>
                      <p className="text-sm font-serif">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-saddle-brown/10">
              <div className="flex gap-3">
                <input 
                  type="text"
                  placeholder="Draft a message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 bg-parchment/20 border border-saddle-brown/10 rounded-xl py-3 px-4 font-serif text-sm outline-none focus:border-antique-gold"
                />
                <Button onClick={sendMessage} className="bg-saddle-brown hover:bg-leather text-parchment rounded-xl px-6">
                  <Send size={20} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-saddle-brown/20 p-12 text-center">
            <div className="w-24 h-24 rounded-full border-4 border-current flex items-center justify-center mb-6">
              <MessageCircle size={48} />
            </div>
            <h3 className="font-serif text-2xl font-bold mb-2">The Silent Archives</h3>
            <p className="text-sm font-serif italic max-w-xs">Select a fellow scholar from the network to initiate a private correspondence.</p>
          </div>
        )}
      </div>

      {selectedUser && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reporterId={user.uid}
          reportedId={selectedUser.uid}
          reportedName={selectedUser.displayName}
          context="Peer Chat"
        />
      )}
    </div>
  );
}
