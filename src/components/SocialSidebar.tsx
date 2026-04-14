import React from 'react';
import { Send, Instagram, MessageCircle, Phone } from 'lucide-react';
import { motion } from 'motion/react';

export function SocialSidebar() {
  const socialLinks = [
    { icon: <Send size={20} />, label: 'Telegram', href: 'https://t.me/imperialscholar', color: 'bg-[#229ED9]' },
    { icon: <Instagram size={20} />, label: 'Instagram', href: 'https://instagram.com/imperialscholar', color: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]' },
    { icon: <MessageCircle size={20} />, label: 'WhatsApp', href: 'https://wa.me/919876543210', color: 'bg-[#25D366]' },
  ];

  return (
    <div className="flex flex-col gap-3 items-center">
      {socialLinks.map((link, idx) => (
        <motion.a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: idx * 0.1 }}
          whileHover={{ scale: 1.1, x: -5 }}
          className={`${link.color} text-white p-3 rounded-full shadow-xl flex items-center justify-center group relative`}
        >
          {link.icon}
          <span className="absolute right-full mr-3 px-2 py-1 bg-leather text-parchment text-[10px] font-bold uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {link.label}
          </span>
        </motion.a>
      ))}
    </div>
  );
}
