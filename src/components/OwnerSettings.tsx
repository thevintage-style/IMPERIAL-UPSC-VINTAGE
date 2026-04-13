import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot, query, orderBy, OperationType, handleFirestoreError, addDoc, deleteDoc, updateDoc, limit } from '../lib/firebase';
import { Shield, Save, CreditCard, IndianRupee, History, Check, X, Plus, Trash2, Settings, Package, Database, RefreshCw, Activity, Cpu, Users, TrendingUp, AlertCircle, Lock, Eye, BarChart3, Zap, MessageSquare, Send } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface OwnerSettingsProps {
  user: User;
}

type AdminTab = 'payments' | 'plans' | 'system' | 'storage' | 'verifications' | 'resources' | 'intelligence' | 'crm' | 'security' | 'videos' | 'discounts' | 'support';

export function OwnerSettings({ user }: OwnerSettingsProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('intelligence');
  const [loading, setLoading] = useState(false);
  const [businessMode, setBusinessMode] = useState<'upsc' | 'side'>('upsc');
  
  // Payments State
  const [upiIds, setUpiIds] = useState<any[]>([]);
  const [newUpi, setNewUpi] = useState({ upiId: '', label: '' });
  
  // Plans State
  const [plans, setPlans] = useState<any[]>([]);
  const [newPlan, setNewPlan] = useState({ name: '', duration: '', price: 0, features: [''], isActive: true, highlight: false });
  
  // Resources State
  const [resources, setResources] = useState<any[]>([]);
  const [newResource, setNewResource] = useState({ title: '', category: 'prelims', type: 'pdf', url: '', description: '' });

  // Videos & Playlists State
  const [videos, setVideos] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newVideo, setNewVideo] = useState({ title: '', url: '', type: 'youtube', playlistId: '', description: '' });
  const [newPlaylist, setNewPlaylist] = useState({ title: '', description: '', type: 'video' });

  // Discounts State
  const [discountOffers, setDiscountOffers] = useState<any[]>([]);
  const [newDiscount, setNewDiscount] = useState({ code: '', description: '', discountPercentage: 0, expiryDate: '', isActive: true });

  // System State
  const [appConfig, setAppConfig] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  
  // Verifications State
  const [transactions, setTransactions] = useState<any[]>([]);

  // Support State
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [adminReply, setAdminReply] = useState('');

  // CRM & BI State
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [engagementStats, setEngagementStats] = useState<any[]>([]);

  useEffect(() => {
    // ... existing fetches ...
    // Fetch App Config
    const configPath = 'settings/appConfig';
    const unsubscribeConfig = onSnapshot(doc(db, configPath), (doc) => {
      if (doc.exists()) setAppConfig(doc.data());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, configPath);
    });

    // Fetch UPI IDs
    const upiPath = 'upiIds';
    const unsubscribeUpi = onSnapshot(collection(db, upiPath), (snapshot) => {
      setUpiIds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, upiPath);
    });

    // Fetch Plans
    const plansPath = 'plans';
    const unsubscribePlans = onSnapshot(collection(db, plansPath), (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, plansPath);
    });

    // Fetch Transactions
    const txPath = 'transactions';
    const qTx = query(collection(db, txPath), orderBy('createdAt', 'desc'));
    const unsubscribeTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, txPath);
    });

    // Fetch Resources
    const resourcesPath = 'resources';
    const unsubscribeResources = onSnapshot(collection(db, resourcesPath), (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, resourcesPath);
    });

    // Fetch Videos
    const videosPath = 'videos';
    const unsubscribeVideos = onSnapshot(collection(db, videosPath), (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, videosPath);
    });

    // Fetch Playlists
    const playlistsPath = 'playlists';
    const unsubscribePlaylists = onSnapshot(collection(db, playlistsPath), (snapshot) => {
      setPlaylists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, playlistsPath);
    });

    // Fetch Discounts
    const discountsPath = 'discountOffers';
    const unsubscribeDiscounts = onSnapshot(collection(db, discountsPath), (snapshot) => {
      setDiscountOffers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, discountsPath);
    });

    // Fetch Users
    const usersPath = 'users';
    const unsubscribeUsers = onSnapshot(collection(db, usersPath), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, usersPath);
    });

    // Fetch Audit Logs
    const auditPath = 'auditLogs';
    const qAudit = query(collection(db, auditPath), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeAudit = onSnapshot(qAudit, (snapshot) => {
      setAuditLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, auditPath);
    });

    // Fetch Engagement Stats
    const statsPath = 'engagementStats';
    const qStats = query(collection(db, statsPath), orderBy('date', 'desc'), limit(30));
    const unsubscribeStats = onSnapshot(qStats, (snapshot) => {
      setEngagementStats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, statsPath);
    });

    // Fetch Support Chats
    const chatsPath = 'supportChats';
    const qChats = query(collection(db, chatsPath), orderBy('lastMessageAt', 'desc'));
    const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
      setSupportChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, chatsPath);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeUpi();
      unsubscribePlans();
      unsubscribeTx();
      unsubscribeResources();
      unsubscribeVideos();
      unsubscribePlaylists();
      unsubscribeDiscounts();
      unsubscribeUsers();
      unsubscribeAudit();
      unsubscribeStats();
      unsubscribeChats();
    };
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    const messagesPath = `supportChats/${activeChat.id}/messages`;
    const qMsg = query(collection(db, messagesPath), orderBy('createdAt', 'asc'));
    const unsubscribeMsg = onSnapshot(qMsg, (snapshot) => {
      setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribeMsg();
  }, [activeChat]);

  const sendAdminReply = async () => {
    if (!adminReply.trim() || !activeChat) return;
    const messagesPath = `supportChats/${activeChat.id}/messages`;
    try {
      await addDoc(collection(db, messagesPath), {
        chatId: activeChat.id,
        senderId: user.uid,
        senderRole: 'admin',
        text: adminReply,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'supportChats', activeChat.id), {
        lastMessageAt: serverTimestamp()
      });
      setAdminReply('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, messagesPath);
    }
  };

  const logAction = async (action: string, details: string) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        adminId: user.uid,
        action,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to log audit action", error);
    }
  };

  const handleAddResource = async () => {
    if (!newResource.title || !newResource.url) return;
    try {
      await addDoc(collection(db, 'resources'), {
        ...newResource,
        createdAt: serverTimestamp()
      });
      setNewResource({ title: '', category: 'prelims', type: 'pdf', url: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'resources');
    }
  };

  const deleteResource = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'resources', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `resources/${id}`);
    }
  };

  const handleAddUpi = async () => {
    if (!newUpi.upiId || !newUpi.label) return;
    try {
      await addDoc(collection(db, 'upiIds'), {
        ...newUpi,
        isActive: true,
        isPrimary: upiIds.length === 0,
        usageCount: 0
      });
      await logAction('UPI_ADDED', `New UPI ID added: ${newUpi.upiId} (${newUpi.label})`);
      setNewUpi({ upiId: '', label: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'upiIds');
    }
  };

  const toggleUpiStatus = async (id: string, current: boolean) => {
    try {
      await setDoc(doc(db, 'upiIds', id), { isActive: !current }, { merge: true });
      await logAction('UPI_STATUS_TOGGLED', `UPI ID ${id} status changed to ${!current ? 'Active' : 'Inactive'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `upiIds/${id}`);
    }
  };

  const setPrimaryUpi = async (id: string) => {
    try {
      const upi = upiIds.find(u => u.id === id);
      const batch = upiIds.map(u => 
        setDoc(doc(db, 'upiIds', u.id), { isPrimary: u.id === id }, { merge: true })
      );
      await Promise.all(batch);
      await setDoc(doc(db, 'settings/appConfig'), { activeUpiId: upi?.upiId }, { merge: true });
      await logAction('UPI_PRIMARY_SET', `Primary UPI ID set to ${upi?.upiId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'upiIds');
    }
  };

  const handleAddPlan = async () => {
    try {
      const planData = {
        ...newPlan,
        features: newPlan.features.filter(f => f.trim() !== '')
      };
      await addDoc(collection(db, 'plans'), planData);
      await logAction('PLAN_CREATED', `New subscription plan created: ${newPlan.name}`);
      setNewPlan({ name: '', duration: '', price: 0, features: [''], isActive: true, highlight: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'plans');
    }
  };

  const deletePlan = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'plans', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `plans/${id}`);
    }
  };

  const triggerUpdate = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/system/update', { method: 'POST' });
      const data = await response.json();
      alert(data.message || "System update sequence initiated.");
    } catch (error) {
      alert("Failed to communicate with the Imperial Build Server.");
    } finally {
      setIsUpdating(false);
    }
  };

  const provisionStorage = async () => {
    try {
      const response = await fetch('/api/system/provision-storage', { method: 'POST' });
      const data = await response.json();
      alert(data.message || "Extra storage provisioned successfully.");
    } catch (error) {
      alert("Storage provisioning failed.");
    }
  };

  const verifyTransaction = async (txId: string, status: 'approved' | 'rejected', userId: string) => {
    const txPath = `transactions/${txId}`;
    const userPath = `users/${userId}`;
    try {
      await setDoc(doc(db, txPath), { status }, { merge: true });
      if (status === 'approved') {
        await setDoc(doc(db, userPath), {
          subscriptionStatus: 'pro',
          subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, txPath);
    }
  };

  const handleAddVideo = async () => {
    if (!newVideo.title || !newVideo.url) return;
    try {
      await addDoc(collection(db, 'videos'), {
        ...newVideo,
        createdAt: serverTimestamp()
      });
      await logAction('VIDEO_ADDED', `New video added: ${newVideo.title} (${newVideo.type})`);
      setNewVideo({ title: '', url: '', type: 'youtube', playlistId: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'videos');
    }
  };

  const handleAddPlaylist = async () => {
    if (!newPlaylist.title) return;
    try {
      await addDoc(collection(db, 'playlists'), {
        ...newPlaylist,
        createdAt: serverTimestamp()
      });
      await logAction('PLAYLIST_CREATED', `New playlist created: ${newPlaylist.title}`);
      setNewPlaylist({ title: '', description: '', type: 'video' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'playlists');
    }
  };

  const handleAddDiscount = async () => {
    if (!newDiscount.code || !newDiscount.discountPercentage) return;
    try {
      await addDoc(collection(db, 'discountOffers'), {
        ...newDiscount,
        createdAt: serverTimestamp()
      });
      await logAction('DISCOUNT_CREATED', `New discount offer created: ${newDiscount.code}`);
      setNewDiscount({ code: '', description: '', discountPercentage: 0, expiryDate: '', isActive: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'discountOffers');
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'videos', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `videos/${id}`);
    }
  };

  const deletePlaylist = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'playlists', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `playlists/${id}`);
    }
  };

  const deleteDiscount = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'discountOffers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `discountOffers/${id}`);
    }
  };

  const tabs = [
    { id: 'intelligence', label: 'Intelligence', icon: BarChart3 },
    { id: 'crm', label: 'CRM', icon: Users },
    { id: 'verifications', label: 'Verifications', icon: History },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'plans', label: 'Plans', icon: Package },
    { id: 'discounts', label: 'Discounts', icon: Zap },
    { id: 'videos', label: 'Videos', icon: Eye },
    { id: 'resources', label: 'Resources', icon: Database },
    { id: 'support', label: 'Support', icon: MessageSquare },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'system', label: 'System', icon: Settings },
  ];

  const mockRevenueData = [
    { name: 'Week 1', revenue: 45000, predicted: 45000 },
    { name: 'Week 2', revenue: 52000, predicted: 52000 },
    { name: 'Week 3', revenue: 48000, predicted: 48000 },
    { name: 'Week 4', revenue: 61000, predicted: 61000 },
    { name: 'Next Week', predicted: 75000 },
  ];

  const getEngagementScore = (lastLogin: string) => {
    const days = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 1) return { score: 100, color: 'text-green-500' };
    if (days <= 3) return { score: 70, color: 'text-yellow-500' };
    return { score: 30, color: 'text-red-500' };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[#5A5A40] rounded-2xl shadow-lg">
            <Shield className="text-white" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#1a1a1a]">Vizier's Command Center</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-[#5A5A40]/60 font-serif italic">Imperial Oversight</span>
              <div className="h-4 w-[1px] bg-[#5A5A40]/20 mx-2" />
              <button 
                onClick={() => setBusinessMode(businessMode === 'upsc' ? 'side' : 'upsc')}
                className="flex items-center gap-2 px-3 py-1 bg-[#f5f2ed] rounded-full border border-[#5A5A40]/10 hover:bg-[#e5e2dd] transition-all"
              >
                <Zap size={14} className={businessMode === 'upsc' ? 'text-[#5A5A40]' : 'text-yellow-600'} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">
                  {businessMode === 'upsc' ? 'UPSC Portal' : 'Side Business'}
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex bg-[#f5f2ed] p-1.5 rounded-2xl border border-[#5A5A40]/10 overflow-x-auto max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-serif font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? "bg-white text-[#5A5A40] shadow-md" 
                  : "text-[#5A5A40]/40 hover:text-[#5A5A40]"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'intelligence' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
                  <TrendingUp className="text-[#5A5A40] mb-4" size={24} />
                  <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60 mb-1">Projected Revenue</p>
                  <p className="text-3xl font-serif font-bold text-[#1a1a1a]">₹7.5L</p>
                  <p className="text-xs text-green-600 font-bold mt-2">+22% from last month</p>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
                  <Users className="text-[#5A5A40] mb-4" size={24} />
                  <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60 mb-1">Active Scholars</p>
                  <p className="text-3xl font-serif font-bold text-[#1a1a1a]">{allUsers.length}</p>
                  <p className="text-xs text-[#5A5A40]/60 font-serif italic mt-2">Real-time engagement</p>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
                  <AlertCircle className="text-red-500 mb-4" size={24} />
                  <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60 mb-1">At-Risk Students</p>
                  <p className="text-3xl font-serif font-bold text-[#1a1a1a]">
                    {allUsers.filter(u => getEngagementScore(u.lastLoginAt || u.createdAt).score < 50).length}
                  </p>
                  <p className="text-xs text-red-500 font-bold mt-2">Requires motivation push</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
                <h3 className="font-serif text-xl font-bold mb-8">Revenue Prediction & Trends</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockRevenueData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#5A5A40" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#5A5A4011" />
                      <XAxis dataKey="name" stroke="#5A5A4044" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#5A5A4044" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #5A5A4022', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#5A5A40" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                      <Area type="monotone" dataKey="predicted" stroke="#5A5A40" strokeDasharray="5 5" fill="transparent" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-serif text-xl font-bold">Student Success & CRM</h3>
                <div className="flex gap-2">
                  <Button className="bg-[#f5f2ed] text-[#5A5A40] text-xs font-bold uppercase tracking-widest rounded-xl">Export Logs</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#5A5A40]/10">
                      <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">Student</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">Status</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">Engagement</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">Last Login</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => {
                      const eng = getEngagementScore(u.lastLoginAt || u.createdAt);
                      return (
                        <tr key={u.id} className="border-b border-[#5A5A40]/5 hover:bg-[#f5f2ed]/30 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#5A5A40]/10 rounded-full flex items-center justify-center text-[#5A5A40] font-bold text-xs">
                                {u.displayName?.[0] || 'S'}
                              </div>
                              <div>
                                <p className="font-serif font-bold text-sm">{u.displayName}</p>
                                <p className="text-[10px] text-[#5A5A40]/60">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                              u.subscriptionStatus === 'pro' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {u.subscriptionStatus}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
                                <div className={`h-full ${eng.color.replace('text', 'bg')}`} style={{ width: `${eng.score}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${eng.color}`}>{eng.score}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs text-[#5A5A40]/60 font-serif italic">
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <button className="p-2 hover:bg-[#5A5A40]/10 rounded-lg text-[#5A5A40] transition-colors" title="Extend Subscription">
                                <Plus size={16} />
                              </button>
                              <button className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors" title="Refund/Cancel">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
              <h3 className="font-serif text-xl font-bold mb-8 flex items-center gap-3">
                <Lock className="text-[#5A5A40]" />
                Security Audit Logs
              </h3>
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-[#f5f2ed] rounded-2xl border border-[#5A5A40]/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg border border-[#5A5A40]/10">
                        <Eye size={16} className="text-[#5A5A40]" />
                      </div>
                      <div>
                        <p className="text-sm font-serif font-bold text-[#1a1a1a]">{log.action}</p>
                        <p className="text-xs text-[#5A5A40]/60 font-serif italic">{log.details}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#5A5A40]/40">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-center py-12 text-[#5A5A40]/40 font-serif italic">The security scrolls are currently empty.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === 'verifications' && (
            <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
              <h3 className="font-serif text-xl font-bold mb-6 flex items-center gap-3">
                <History className="text-[#5A5A40]" />
                Pending Tributes
              </h3>
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-center py-12 text-[#5A5A40]/40 font-serif italic">No pending transactions found in the scrolls.</p>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex flex-col md:flex-row items-center justify-between p-6 bg-[#f5f2ed] rounded-3xl border border-[#5A5A40]/10 gap-4">
                      <div className="space-y-1">
                        <p className="font-serif font-bold text-[#1a1a1a]">{tx.userName}</p>
                        <p className="text-xs text-[#5A5A40]/60 font-mono">TXN: {tx.transactionId}</p>
                        <p className="text-[10px] text-[#5A5A40]/40 uppercase tracking-widest">{new Date(tx.createdAt?.toDate?.() || tx.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {tx.status === 'pending' ? (
                          <>
                            <button 
                              onClick={() => verifyTransaction(tx.id, 'approved', tx.userId)}
                              className="p-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors"
                            >
                              <Check size={20} />
                            </button>
                            <button 
                              onClick={() => verifyTransaction(tx.id, 'rejected', tx.userId)}
                              className="p-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
                            >
                              <X size={20} />
                            </button>
                          </>
                        ) : (
                          <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                            tx.status === 'approved' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {tx.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
                <h3 className="font-serif text-xl font-bold mb-6">UPI Rotation Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">Label (e.g. HDFC Primary)</label>
                    <input 
                      type="text"
                      value={newUpi.label}
                      onChange={(e) => setNewUpi({...newUpi, label: e.target.value})}
                      className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">UPI ID</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newUpi.upiId}
                        onChange={(e) => setNewUpi({...newUpi, upiId: e.target.value})}
                        className="flex-1 bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                      />
                      <Button onClick={handleAddUpi} className="bg-[#5A5A40] text-white rounded-xl">
                        <Plus size={20} />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {upiIds.map((upi) => (
                    <div key={upi.id} className="flex items-center justify-between p-6 bg-[#f5f2ed] rounded-3xl border border-[#5A5A40]/10">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${upi.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-serif font-bold">{upi.label}</p>
                          <p className="text-xs text-[#5A5A40]/60 font-mono">{upi.upiId}</p>
                        </div>
                        {upi.isPrimary && (
                          <span className="bg-[#5A5A40] text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Primary</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => setPrimaryUpi(upi.id)}
                          disabled={upi.isPrimary}
                          className="text-xs bg-white text-[#5A5A40] border border-[#5A5A40]/10 rounded-lg px-3 py-1"
                        >
                          Make Primary
                        </Button>
                        <Button 
                          onClick={() => toggleUpiStatus(upi.id, upi.isActive)}
                          className={`text-xs rounded-lg px-3 py-1 ${upi.isActive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                        >
                          {upi.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
                <h3 className="font-serif text-xl font-bold mb-6">Subscription Plan Designer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <input 
                    placeholder="Plan Name"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                    className="bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                  />
                  <input 
                    placeholder="Duration (e.g. 6 Months)"
                    value={newPlan.duration}
                    onChange={(e) => setNewPlan({...newPlan, duration: e.target.value})}
                    className="bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                  />
                  <input 
                    type="number"
                    placeholder="Price (₹)"
                    value={newPlan.price}
                    onChange={(e) => setNewPlan({...newPlan, price: Number(e.target.value)})}
                    className="bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                  />
                </div>
                <div className="space-y-4 mb-8">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60">Features</label>
                  {newPlan.features.map((feature, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...newPlan.features];
                          newFeatures[idx] = e.target.value;
                          setNewPlan({...newPlan, features: newFeatures});
                        }}
                        className="flex-1 bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-2 px-4 font-serif text-sm outline-none"
                      />
                      {idx === newPlan.features.length - 1 && (
                        <Button onClick={() => setNewPlan({...newPlan, features: [...newPlan.features, '']})} className="bg-[#5A5A40] text-white">
                          <Plus size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-6 mb-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newPlan.highlight}
                      onChange={(e) => setNewPlan({...newPlan, highlight: e.target.checked})}
                      className="w-4 h-4 accent-[#5A5A40]"
                    />
                    <span className="text-sm font-serif">Highlight Plan</span>
                  </label>
                </div>
                <Button onClick={handleAddPlan} className="w-full bg-[#5A5A40] text-white py-6 rounded-2xl font-bold">
                  Create Imperial Plan
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans.map((plan) => (
                  <div key={plan.id} className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm relative group">
                    <button 
                      onClick={() => deletePlan(plan.id)}
                      className="absolute top-6 right-6 p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={18} />
                    </button>
                    <h4 className="text-2xl font-serif font-bold mb-2">{plan.name}</h4>
                    <p className="text-[#5A5A40] font-serif font-bold text-xl mb-4">₹{plan.price} <span className="text-sm font-normal text-[#5A5A40]/60">/ {plan.duration}</span></p>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f: string, i: number) => (
                        <li key={i} className="text-sm font-serif flex items-center gap-2">
                          <Check size={14} className="text-green-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2">
                      {plan.highlight && <span className="bg-[#5A5A40] text-white text-[10px] px-2 py-1 rounded-full uppercase font-bold">Highlighted</span>}
                      {plan.isActive && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full uppercase font-bold">Active</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'discounts' && (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
                <h3 className="font-serif text-xl font-bold mb-6">Discount & Offers Manager</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <input 
                    placeholder="Offer Code (e.g. UPSC2026)"
                    value={newDiscount.code}
                    onChange={(e) => setNewDiscount({...newDiscount, code: e.target.value.toUpperCase()})}
                    className="bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                  />
                  <input 
                    type="number"
                    placeholder="Discount %"
                    value={newDiscount.discountPercentage}
                    onChange={(e) => setNewDiscount({...newDiscount, discountPercentage: Number(e.target.value)})}
                    className="bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                  />
                  <input 
                    type="date"
                    value={newDiscount.expiryDate}
                    onChange={(e) => setNewDiscount({...newDiscount, expiryDate: e.target.value})}
                    className="bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                  />
                  <Button onClick={handleAddDiscount} className="bg-[#5A5A40] text-white rounded-xl py-3">
                    Add Offer
                  </Button>
                </div>
                <textarea 
                  placeholder="Offer Description..."
                  value={newDiscount.description}
                  onChange={(e) => setNewDiscount({...newDiscount, description: e.target.value})}
                  className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none h-20 resize-none mb-4"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {discountOffers.map((offer) => (
                  <div key={offer.id} className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm relative group overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#5A5A40] text-white px-6 py-2 rounded-bl-3xl font-bold">
                      {offer.discountPercentage}% OFF
                    </div>
                    <button 
                      onClick={() => deleteDiscount(offer.id)}
                      className="absolute bottom-6 right-6 p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={18} />
                    </button>
                    <h4 className="text-2xl font-serif font-bold mb-2">{offer.code}</h4>
                    <p className="text-sm text-[#5A5A40]/60 font-serif mb-4">{offer.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40">Expires: {new Date(offer.expiryDate).toLocaleDateString()}</span>
                      {offer.isActive ? (
                        <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full uppercase font-bold">Live</span>
                      ) : (
                        <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-full uppercase font-bold">Inactive</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
                <h3 className="font-serif text-xl font-bold mb-6">Imperial Media Library</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h4 className="font-serif font-bold text-[#5A5A40]">Add New Media</h4>
                    <div className="space-y-4">
                      <input 
                        placeholder="Video/Podcast Title"
                        value={newVideo.title}
                        onChange={(e) => setNewVideo({...newVideo, title: e.target.value})}
                        className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <select 
                          value={newVideo.type}
                          onChange={(e) => setNewVideo({...newVideo, type: e.target.value as any})}
                          className="bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                        >
                          <option value="youtube">YouTube Link</option>
                          <option value="community">Community Link</option>
                          <option value="podcast">Podcast</option>
                        </select>
                        <select 
                          value={newVideo.playlistId}
                          onChange={(e) => setNewVideo({...newVideo, playlistId: e.target.value})}
                          className="bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                        >
                          <option value="">No Playlist</option>
                          {playlists.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      </div>
                      <input 
                        placeholder="Media URL"
                        value={newVideo.url}
                        onChange={(e) => setNewVideo({...newVideo, url: e.target.value})}
                        className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                      />
                      <Button onClick={handleAddVideo} className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-bold">
                        Add to Media Library
                      </Button>
                    </div>

                    <div className="pt-8 border-t border-[#5A5A40]/10">
                      <h4 className="font-serif font-bold text-[#5A5A40] mb-4">Create Playlist</h4>
                      <div className="space-y-4">
                        <input 
                          placeholder="Playlist Title"
                          value={newPlaylist.title}
                          onChange={(e) => setNewPlaylist({...newPlaylist, title: e.target.value})}
                          className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                        />
                        <select 
                          value={newPlaylist.type}
                          onChange={(e) => setNewPlaylist({...newPlaylist, type: e.target.value as any})}
                          className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-xl py-3 px-4 font-serif outline-none"
                        >
                          <option value="video">Video Playlist</option>
                          <option value="podcast">Podcast Series</option>
                        </select>
                        <Button onClick={handleAddPlaylist} className="w-full bg-white text-[#5A5A40] border border-[#5A5A40]/20 py-3 rounded-xl font-bold">
                          Create Playlist
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="font-serif font-bold text-[#5A5A40]">Media Archives</h4>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {videos.map((vid) => (
                        <div key={vid.id} className="p-4 bg-[#f5f2ed] rounded-2xl border border-[#5A5A40]/10 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#5A5A40] border border-[#5A5A40]/10">
                              <Eye size={20} />
                            </div>
                            <div>
                              <p className="font-serif font-bold text-sm">{vid.title}</p>
                              <p className="text-[10px] uppercase tracking-widest text-[#5A5A40]/40 font-bold">{vid.type}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => deleteVideo(vid.id)}
                            className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
              <h3 className="font-serif text-xl font-bold mb-8 flex items-center gap-3">
                <Database className="text-[#5A5A40]" />
                UPSC Resource Archives
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h4 className="font-serif font-bold text-[#5A5A40]">Add New Resource</h4>
                  <div className="space-y-4">
                    <input 
                      type="text"
                      placeholder="Resource Title (e.g., Laxmikanth Summary)"
                      value={newResource.title}
                      onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                      className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <select 
                        value={newResource.category}
                        onChange={(e) => setNewResource({...newResource, category: e.target.value as any})}
                        className="bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                      >
                        <option value="prelims">Prelims</option>
                        <option value="mains">Mains</option>
                        <option value="interview">Interview</option>
                        <option value="current-affairs">Current Affairs</option>
                      </select>
                      <select 
                        value={newResource.type}
                        onChange={(e) => setNewResource({...newResource, type: e.target.value as any})}
                        className="bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                      >
                        <option value="pdf">PDF Document</option>
                        <option value="video">Video Lecture</option>
                        <option value="link">External Link</option>
                      </select>
                    </div>
                    <input 
                      type="text"
                      placeholder="Resource URL (Google Drive/S3/YouTube)"
                      value={newResource.url}
                      onChange={(e) => setNewResource({...newResource, url: e.target.value})}
                      className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                    />
                    <textarea 
                      placeholder="Brief description..."
                      value={newResource.description}
                      onChange={(e) => setNewResource({...newResource, description: e.target.value})}
                      className="w-full bg-[#f5f2ed] border border-[#5A5A40]/10 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-[#5A5A40] h-32 resize-none"
                    />
                    <Button 
                      onClick={handleAddResource}
                      className="w-full bg-[#5A5A40] text-white py-6 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all"
                    >
                      Add to Archives
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-serif font-bold text-[#5A5A40]">Current Archives</h4>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {resources.map((res) => (
                      <div key={res.id} className="p-6 bg-[#f5f2ed] rounded-3xl border border-[#5A5A40]/10 flex items-center justify-between group">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-[#5A5A40] text-white px-2 py-0.5 rounded">
                              {res.category}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40">
                              {res.type}
                            </span>
                          </div>
                          <h5 className="font-serif font-bold text-[#1a1a1a]">{res.title}</h5>
                          <p className="text-xs text-[#5A5A40]/60 truncate max-w-[200px]">{res.url}</p>
                        </div>
                        <button 
                          onClick={() => deleteResource(res.id)}
                          className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
              <h3 className="font-serif text-xl font-bold mb-8 flex items-center gap-3">
                <Database className="text-[#5A5A40]" />
                Imperial Resource Manager
              </h3>
              
              <div className="space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-serif font-bold">Storage Capacity (UPSC PDFs & Media)</span>
                    <span className="text-sm font-serif text-[#5A5A40]/60">
                      {((appConfig.storageUsed || 0) / (appConfig.storageLimit || 100) * 100).toFixed(1)}% Used
                    </span>
                  </div>
                  <div className="h-4 bg-[#f5f2ed] rounded-full overflow-hidden border border-[#5A5A40]/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(appConfig.storageUsed || 0) / (appConfig.storageLimit || 100) * 100}%` }}
                      className={`h-full transition-all duration-1000 ${
                        (appConfig.storageUsed || 0) / (appConfig.storageLimit || 100) > 0.8 ? 'bg-red-500' : 'bg-[#5A5A40]'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-[#5A5A40]/40">
                    <span>0 GB</span>
                    <span>{appConfig.storageLimit || 100} GB Limit</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#f5f2ed] p-6 rounded-3xl border border-[#5A5A40]/10">
                    <Activity className="text-[#5A5A40] mb-4" size={24} />
                    <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60 mb-1">Real-time Load</p>
                    <p className="text-2xl font-serif font-bold">Optimal</p>
                  </div>
                  <div className="bg-[#f5f2ed] p-6 rounded-3xl border border-[#5A5A40]/10">
                    <RefreshCw className="text-[#5A5A40] mb-4" size={24} />
                    <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60 mb-1">Sync Status</p>
                    <p className="text-2xl font-serif font-bold">Active</p>
                  </div>
                  <div className="bg-[#f5f2ed] p-6 rounded-3xl border border-[#5A5A40]/10">
                    <Cpu className="text-[#5A5A40] mb-4" size={24} />
                    <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60 mb-1">Compute</p>
                    <p className="text-2xl font-serif font-bold">Balanced</p>
                  </div>
                </div>

                <Button 
                  onClick={provisionStorage}
                  className="w-full bg-[#1a1a1a] text-white py-8 rounded-2xl text-lg font-bold hover:bg-black transition-all flex items-center justify-center gap-3"
                >
                  <Plus size={24} />
                  Provision Extra Storage Capacity
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
          <div className="lg:col-span-1 bg-white rounded-3xl border border-[#5A5A40]/10 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#5A5A40]/5 bg-[#f5f2ed]/30">
              <h3 className="font-serif font-bold text-sm text-[#5A5A40]">Scholar Inquiries</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {supportChats.map(chat => (
                <button 
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`w-full text-left p-4 rounded-2xl transition-all ${activeChat?.id === chat.id ? 'bg-[#5A5A40] text-white shadow-md' : 'hover:bg-[#f5f2ed] text-[#5A5A40]'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold truncate">{chat.userId.slice(0, 8)}...</span>
                    <span className={`text-[10px] ${activeChat?.id === chat.id ? 'text-white/60' : 'text-[#5A5A40]/40'}`}>
                      {new Date(chat.lastMessageAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-[10px] truncate ${activeChat?.id === chat.id ? 'text-white/80' : 'text-[#5A5A40]/60'}`}>
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl border border-[#5A5A40]/10 shadow-sm flex flex-col overflow-hidden">
            {activeChat ? (
              <>
                <div className="p-4 border-b border-[#5A5A40]/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#f5f2ed] rounded-full flex items-center justify-center text-[#5A5A40]">
                      <Users size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-serif font-bold">Chat with Scholar</h4>
                      <p className="text-[10px] text-[#5A5A40]/40">{activeChat.userId}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                        msg.senderRole === 'admin' ? 'bg-[#5A5A40] text-white rounded-tr-none' : 'bg-[#f5f2ed] text-[#1a1a1a] rounded-tl-none border border-[#5A5A40]/10'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-[#5A5A40]/5 bg-[#f5f2ed]/30">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Imperial response..."
                      value={adminReply}
                      onChange={(e) => setAdminReply(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendAdminReply()}
                      className="flex-1 bg-white border border-[#5A5A40]/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#5A5A40]"
                    />
                    <Button onClick={sendAdminReply} className="bg-[#5A5A40] hover:bg-[#4A4A30] text-white rounded-xl px-4">
                      <Send size={16} />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="w-16 h-16 bg-[#f5f2ed] rounded-full flex items-center justify-center text-[#5A5A40]/20">
                  <MessageSquare size={32} />
                </div>
                <p className="text-[#5A5A40]/40 font-serif italic">Select a scholar chat to begin oversight</p>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'system' && (
            <div className="bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
              <h3 className="font-serif text-xl font-bold mb-8">System Maintenance</h3>
              
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 bg-[#f5f2ed] rounded-3xl border border-[#5A5A40]/10">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60 mb-4">Version Control</p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-serif">Current Build</span>
                        <code className="bg-white px-3 py-1 rounded-lg border border-[#5A5A40]/10 text-xs font-mono">v{appConfig.systemVersion || '1.0.4'}</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-serif">Environment</span>
                        <span className="text-xs font-bold uppercase tracking-widest text-green-600">Production</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-serif">Last Deployment</span>
                        <span className="text-xs font-serif text-[#5A5A40]/60">{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-[#f5f2ed] rounded-3xl border border-[#5A5A40]/10">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/60 mb-4">Build Status</p>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-serif font-bold">System Healthy</span>
                    </div>
                    <p className="text-xs text-[#5A5A40]/60 font-serif leading-relaxed">
                      All modules are operating within normal parameters. AI Studio integration is active and responding to queries.
                    </p>
                  </div>
                </div>

                <div className="pt-8 border-t border-[#5A5A40]/10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="font-serif font-bold text-red-600 mb-1">Danger Zone</h4>
                      <p className="text-sm text-[#5A5A40]/60 font-serif">
                        Triggering a system update will initiate a new build sequence.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setShowDiff(!showDiff)}
                      className="bg-[#f5f2ed] text-[#5A5A40] text-xs font-bold uppercase tracking-widest rounded-xl"
                    >
                      {showDiff ? "Hide Diff" : "View Diff"}
                    </Button>
                  </div>

                  <AnimatePresence>
                    {showDiff && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-8 overflow-hidden"
                      >
                        <div className="bg-[#1a1a1a] text-green-400 p-6 rounded-2xl font-mono text-xs space-y-2">
                          <p className="text-gray-500"># Pending Changes for v1.0.5</p>
                          <p><span className="text-green-500">+</span> [BI] Added Revenue Prediction Module</p>
                          <p><span className="text-green-500">+</span> [CRM] Added Student Success Tracking</p>
                          <p><span className="text-green-500">+</span> [SEC] Added Audit Logging System</p>
                          <p><span className="text-green-500">+</span> [UI] Added Multi-Business Profit Toggle</p>
                          <p><span className="text-blue-500">~</span> [CORE] Optimized Firestore Listeners</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button 
                    onClick={async () => {
                      await triggerUpdate();
                      await logAction('SYSTEM_UPDATE_TRIGGERED', 'System update sequence initiated via Vizier Command Center');
                    }}
                    disabled={isUpdating}
                    className="w-full bg-red-600 text-white py-8 rounded-2xl text-lg font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-3"
                  >
                    <RefreshCw size={24} className={isUpdating ? 'animate-spin' : ''} />
                    {isUpdating ? "Initiating Build Sequence..." : "Update System & Deploy Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
