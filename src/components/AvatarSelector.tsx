import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Star, Award, User, Check, LucideIcon } from 'lucide-react';
import { Button } from './ui/button';

interface AvatarOption {
  id: string;
  name: string;
  service: 'IAS' | 'IPS' | 'IFS' | 'Admin';
  color: string;
  icon: LucideIcon;
  description: string;
}

const AVATARS: AvatarOption[] = [
  {
    id: 'ias-classic',
    name: 'District Magistrate',
    service: 'IAS',
    color: '#8B4513',
    icon: Award,
    description: 'The classic administrative uniform of the Indian Administrative Service.'
  },
  {
    id: 'ips-officer',
    name: 'Superintendent',
    service: 'IPS',
    color: '#1A1612',
    icon: Shield,
    description: 'The khaki uniform representing the Indian Police Service.'
  },
  {
    id: 'ifs-diplomat',
    name: 'Ambassador',
    service: 'IFS',
    color: '#D4AF37',
    icon: Star,
    description: 'The formal attire of the Indian Foreign Service.'
  },
  {
    id: 'admin-skin',
    name: 'Imperial Vizier',
    service: 'Admin',
    color: '#5A5A40',
    icon: User,
    description: 'Exclusive skin for the platform administrators.'
  }
];

interface AvatarSelectorProps {
  currentAvatarId?: string;
  onSelect: (avatarId: string) => void;
}

export function AvatarSelector({ currentAvatarId, onSelect }: AvatarSelectorProps) {
  const [selected, setSelected] = useState(currentAvatarId || AVATARS[0].id);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVATARS.map((avatar) => (
          <motion.button
            key={avatar.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelected(avatar.id);
              onSelect(avatar.id);
            }}
            className={`p-6 rounded-[32px] border-2 text-left transition-all relative overflow-hidden group ${
              selected === avatar.id 
                ? 'bg-white border-[#8B4513] shadow-xl' 
                : 'bg-[#f5f2ed] border-transparent hover:border-[#8B4513]/20'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-2xl bg-white shadow-sm">
                <avatar.icon size={24} style={{ color: avatar.color }} />
              </div>
              {selected === avatar.id && (
                <div className="bg-[#8B4513] text-white p-1 rounded-full">
                  <Check size={12} />
                </div>
              )}
            </div>
            
            <h4 className="font-serif font-bold text-lg text-[#1a1a1a] mb-1">{avatar.name}</h4>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/60 mb-3">{avatar.service}</p>
            <p className="text-xs text-[#5A5A40]/80 font-serif italic leading-relaxed">
              {avatar.description}
            </p>

            <div 
              className="absolute -bottom-4 -right-4 w-24 h-24 opacity-5 group-hover:opacity-10 transition-opacity"
              style={{ backgroundColor: avatar.color, borderRadius: '50%' }}
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
