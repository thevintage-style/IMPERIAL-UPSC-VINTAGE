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
  updateDoc, 
  deleteDoc,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Plus, 
  Trash2, 
  BookOpen, 
  FileText, 
  ExternalLink,
  Clock,
  User as UserIcon
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface ResourcePost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  type: 'article' | 'pdf' | 'video';
  likes: number;
  commentCount: number;
  link?: string;
  createdAt: any;
}

interface ResourceFeedProps {
  user: User;
  isAdmin: boolean;
}

export function ResourceFeed({ user, isAdmin }: ResourceFeedProps) {
  const [posts, setPosts] = useState<ResourcePost[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', type: 'article' as const, link: '' });

  useEffect(() => {
    if (!user || !db) return;
    const q = query(collection(db, 'resourcePosts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResourcePost)));
    }, (error) => {
      console.error("Resource Feed Listener Error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddPost = async () => {
    if (!newPost.title || !newPost.content) return;
    try {
      await addDoc(collection(db, 'resourcePosts'), {
        ...newPost,
        authorId: user.uid,
        authorName: user.displayName || 'Imperial Admin',
        likes: 0,
        commentCount: 0,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewPost({ title: '', content: '', type: 'article', link: '' });
    } catch (error) {
      console.error("Error adding post:", error);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await updateDoc(doc(db, 'resourcePosts', postId), {
        likes: increment(1)
      });
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to remove this resource from the Imperial Archives?")) {
      try {
        await deleteDoc(doc(db, 'resourcePosts', postId));
      } catch (error) {
        console.error("Error deleting post:", error);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-saddle-brown">Imperial Resource Feed</h2>
          <p className="text-sm font-serif italic text-saddle-brown/60">Curated materials for the dedicated scholar.</p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-saddle-brown hover:bg-leather text-parchment rounded-2xl px-6 flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            Publish Resource
          </Button>
        )}
      </div>

      {/* Feed */}
      <div className="space-y-6">
        <AnimatePresence>
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border-2 border-saddle-brown/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-antique-gold/10 flex items-center justify-center text-antique-gold">
                      {post.type === 'article' ? <FileText size={20} /> : <BookOpen size={20} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-bold text-leather">{post.title}</h3>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-saddle-brown/40 font-bold">
                        <UserIcon size={10} />
                        {post.authorName}
                        <span className="mx-1">•</span>
                        <Clock size={10} />
                        {post.createdAt?.toDate().toLocaleDateString() || 'Recently'}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(post.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <p className="text-leather/80 font-serif leading-relaxed mb-6 whitespace-pre-wrap">
                  {post.content}
                </p>

                {post.link && (
                  <a 
                    href={post.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-saddle-brown font-bold text-sm hover:underline mb-6"
                  >
                    Access Resource <ExternalLink size={14} />
                  </a>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-saddle-brown/5">
                  <div className="flex gap-6">
                    <button 
                      onClick={() => handleLike(post.id)}
                      className="flex items-center gap-2 text-saddle-brown/60 hover:text-red-500 transition-colors group"
                    >
                      <Heart size={18} className="group-hover:fill-current" />
                      <span className="text-xs font-bold">{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-saddle-brown/60 hover:text-saddle-brown transition-colors">
                      <MessageCircle size={18} />
                      <span className="text-xs font-bold">{post.commentCount}</span>
                    </button>
                  </div>
                  <button className="text-saddle-brown/60 hover:text-saddle-brown transition-colors">
                    <Share2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-leather/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-parchment w-full max-w-lg rounded-3xl border-4 border-saddle-brown shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <h3 className="text-2xl font-serif font-bold text-saddle-brown">Publish New Resource</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-saddle-brown/60">Title</label>
                  <input 
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                    className="w-full bg-white border-2 border-saddle-brown/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-antique-gold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-saddle-brown/60">Type</label>
                  <select 
                    value={newPost.type}
                    onChange={(e) => setNewPost({...newPost, type: e.target.value as any})}
                    className="w-full bg-white border-2 border-saddle-brown/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-antique-gold"
                  >
                    <option value="article">Article</option>
                    <option value="pdf">PDF Document</option>
                    <option value="video">Video Lecture</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-saddle-brown/60">Content</label>
                  <textarea 
                    rows={4}
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    className="w-full bg-white border-2 border-saddle-brown/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-antique-gold resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-saddle-brown/60">External Link (Optional)</label>
                  <input 
                    type="url"
                    value={newPost.link}
                    onChange={(e) => setNewPost({...newPost, link: e.target.value})}
                    className="w-full bg-white border-2 border-saddle-brown/10 rounded-xl py-3 px-4 font-serif outline-none focus:border-antique-gold"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => setShowAddModal(false)}
                  variant="ghost"
                  className="flex-1 rounded-xl border-2 border-saddle-brown/10 text-saddle-brown"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddPost}
                  className="flex-1 bg-saddle-brown hover:bg-leather text-parchment rounded-xl"
                >
                  Publish
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
