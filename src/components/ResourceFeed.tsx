import React, { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
  author_id: string;
  author_name: string;
  type: 'article' | 'pdf' | 'video';
  likes: number;
  comment_count: number;
  link?: string;
  created_at: string;
}

interface ResourceFeedProps {
  user: SupabaseUser;
  isAdmin: boolean;
}

export function ResourceFeed({ user, isAdmin }: ResourceFeedProps) {
  const [posts, setPosts] = useState<ResourcePost[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', type: 'article' as const, link: '' });

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('resource_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Resource Feed Fetch Error:", error);
    } else {
      setPosts(data || []);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchPosts();

    const channel = supabase
      .channel('resource_posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_posts' }, fetchPosts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAddPost = async () => {
    if (!newPost.title || !newPost.content) return;
    try {
      await supabase.from('resource_posts').insert({
        ...newPost,
        author_id: user.id,
        author_name: user.user_metadata?.full_name || 'Imperial Admin',
        likes: 0,
        comment_count: 0,
        created_at: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewPost({ title: '', content: '', type: 'article', link: '' });
    } catch (error) {
      console.error("Error adding post:", error);
    }
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    try {
      await supabase.from('resource_posts')
        .update({ likes: currentLikes + 1 })
        .eq('id', postId);
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to remove this resource from the Imperial Archives?")) {
      try {
        await supabase.from('resource_posts').delete().eq('id', postId);
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
                        {post.author_name}
                        <span className="mx-1">•</span>
                        <Clock size={10} />
                        {new Date(post.created_at).toLocaleDateString()}
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
                      onClick={() => handleLike(post.id, post.likes)}
                      className="flex items-center gap-2 text-saddle-brown/60 hover:text-red-500 transition-colors group"
                    >
                      <Heart size={18} className="group-hover:fill-current" />
                      <span className="text-xs font-bold">{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-saddle-brown/60 hover:text-saddle-brown transition-colors">
                      <MessageCircle size={18} />
                      <span className="text-xs font-bold">{post.comment_count}</span>
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
