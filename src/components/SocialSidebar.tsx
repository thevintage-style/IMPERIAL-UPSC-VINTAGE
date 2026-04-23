import React, { useState } from 'react';
import { Send, Instagram, MessageCircle, Share2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function SocialSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const socialLinks = [
    { icon: <Send size={18} />, label: 'Telegram', href: 'https://t.me/imperialscholar', color: 'bg-[#229ED9]' },
    { icon: <Instagram size={18} />, label: 'Instagram', href: 'https://instagram.com/imperialscholar', color: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]' },
    { icon: <MessageCircle size={18} />, label: 'WhatsApp', href: 'https://wa.me/919876543210', color: 'bg-[#25D366]' },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex flex-col items-center">
        <AnimatePresence>
          {isOpen && (
            <div className="absolute bottom-full mb-4 flex flex-col gap-4 items-center">
              {socialLinks.map((link, idx) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ y: 20, opacity: 0, scale: 0.5 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 20, opacity: 0, scale: 0.5 }}
                  transition={{ delay: idx * 0.1, type: "spring", stiffness: 300, damping: 20 }}
                  whileHover={{ scale: 1.2 }}
                  className={`${link.color} text-white w-12 h-12 rounded-full shadow-2xl flex items-center justify-center group relative border-2 border-white/20`}
                >
                  {link.icon}
                  <span className="absolute right-full mr-4 px-3 py-1 bg-leather text-lime text-[8px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-lime/20 backdrop-blur-md">
                    {link.label}
                  </span>
                </motion.a>
              ))}
            </div>
          )}
        </AnimatePresence>

        <motion.button
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          whileHover={{ scale: 1.1, rotate: 180 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl relative z-20 ${isOpen ? 'bg-lime text-leather' : 'bg-leather text-parchment'}`}
        >
          {isOpen ? <Plus size={24} /> : <Share2 size={24} />}
        </motion.button>
      </div>
    </div>
  );
}
