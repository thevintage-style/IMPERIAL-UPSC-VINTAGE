import React from 'react';
import { motion } from 'motion/react';

export function StatueOfUnity() {
  return (
    <div className="flex flex-col items-center group cursor-help select-none">
      <div className="relative origin-bottom">
        {/* The Statue Image - High Res Asset Recovery */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-10"
        >
          <img 
            src="https://www.pngall.com/wp-content/uploads/12/Statue-Of-Unity-PNG-File.png" 
            alt="Statue of Unity" 
            className="w-16 h-32 object-contain filter brightness(0.8) contrast(1.1) sepia(0.3) drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)] transition-all duration-700 group-hover:brightness-100 group-hover:sepia(0)"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://www.pngmart.com/files/22/Statue-Of-Unity-PNG-Transparent.png";
            }}
          />
        </motion.div>
        
        {/* Pedestal - Realistic Bronze Base with Sharp Text */}
        <div className="relative z-20 -mt-4 flex flex-col items-center">
          <div className="w-24 h-8 bg-gradient-to-b from-[#4d3a2b] to-[#2a1f16] border border-[#8B4513] shadow-[0_8px_20px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center rounded-sm transform perspective-1000 rotateX-12 transition-all duration-700 group-hover:rotateX-5 group-hover:scale-105">
            <div className="bg-[#1a110a] px-2 py-0.5 border border-[#D4AF37]/50 rounded-[1px] shadow-inner mb-0.5">
              <span className="text-[6px] text-[#D4AF37] font-bold uppercase tracking-[0.15em] leading-none whitespace-nowrap drop-shadow-sm">
                Statue of Unity
              </span>
            </div>
            <div className="h-[1px] w-16 bg-[#D4AF37]/20" />
          </div>
        </div>

        {/* Realistic Floor Shadow */}
        <div className="w-16 h-3 bg-black/40 rounded-[100%] blur-lg mt-1 mx-auto transform scale-x-150 opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
      </div>
      
      {/* Floor Label - Sharp and Visible */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-3 text-center"
      >
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-[#8B4513] drop-shadow-sm font-serif antialiased">
          Iron Man of India
        </p>
        <div className="h-[1px] w-12 bg-[#8B4513]/20 mx-auto mt-1" />
      </motion.div>
    </div>
  );
}
