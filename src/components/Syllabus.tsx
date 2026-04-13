import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, ChevronLeft, ChevronRight, CheckCircle2, Circle, Lock, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface SyllabusTopic {
  id: string;
  title: string;
  isCompleted: boolean;
  isLocked: boolean;
}

interface SyllabusPage {
  title: string;
  topics: SyllabusTopic[];
  guidelines?: string;
}

const SYLLABUS_DATA: Record<string, SyllabusPage[]> = {
  'Prelims': [
    {
      title: 'General Studies I',
      topics: [
        { id: 'p1-1', title: 'Current events of national and international importance', isCompleted: true, isLocked: false },
        { id: 'p1-2', title: 'History of India and Indian National Movement', isCompleted: false, isLocked: false },
        { id: 'p1-3', title: 'Indian and World Geography', isCompleted: false, isLocked: false },
        { id: 'p1-4', title: 'Indian Polity and Governance', isCompleted: false, isLocked: false },
        { id: 'p1-5', title: 'Economic and Social Development', isCompleted: false, isLocked: false },
        { id: 'p1-6', title: 'General issues on Environmental Ecology', isCompleted: false, isLocked: false },
        { id: 'p1-7', title: 'General Science', isCompleted: false, isLocked: false },
      ],
      guidelines: "Focus on conceptual clarity and current affairs integration. Revision is key for Prelims GS."
    },
    {
      title: 'CSAT (GS II)',
      topics: [
        { id: 'p2-1', title: 'Comprehension', isCompleted: false, isLocked: false },
        { id: 'p2-2', title: 'Interpersonal skills including communication skills', isCompleted: false, isLocked: false },
        { id: 'p2-3', title: 'Logical reasoning and analytical ability', isCompleted: false, isLocked: false },
        { id: 'p2-4', title: 'Decision-making and problem-solving', isCompleted: false, isLocked: false },
        { id: 'p2-5', title: 'General mental ability', isCompleted: false, isLocked: false },
        { id: 'p2-6', title: 'Basic numeracy (Class X level)', isCompleted: false, isLocked: false },
      ],
      guidelines: "Qualifying paper (33%). Practice previous year papers to ensure speed and accuracy."
    }
  ],
  'GS Paper I': [
    {
      title: 'Indian Heritage & Culture',
      topics: [
        { id: 'h1', title: 'Ancient India: Indus Valley to Guptas', isCompleted: true, isLocked: false },
        { id: 'h2', title: 'Medieval India: Sultanate & Mughals', isCompleted: false, isLocked: false },
        { id: 'h3', title: 'Modern India: Freedom Struggle', isCompleted: false, isLocked: false },
        { id: 'h4', title: 'Post-Independence Consolidation', isCompleted: false, isLocked: true },
      ],
      guidelines: "Art and Culture should be studied with a focus on architecture, literature, and philosophy."
    },
    {
      title: 'Geography',
      topics: [
        { id: 'g1', title: 'Physical Geography of the World', isCompleted: false, isLocked: false },
        { id: 'g2', title: 'Indian Physical Geography', isCompleted: false, isLocked: false },
        { id: 'g3', title: 'Economic Geography', isCompleted: false, isLocked: true },
      ],
      guidelines: "Use maps extensively. Relate physical geography with economic activities."
    }
  ],
  'GS Paper II': [
    {
      title: 'Constitution & Polity',
      topics: [
        { id: 'p1', title: 'Indian Constitution: Features & Amendments', isCompleted: false, isLocked: false },
        { id: 'p2', title: 'Parliament & State Legislatures', isCompleted: false, isLocked: false },
        { id: 'p3', title: 'Governance & Public Policy', isCompleted: false, isLocked: true },
        { id: 'p4', title: 'International Relations', isCompleted: false, isLocked: false },
      ],
      guidelines: "Focus on recent Supreme Court judgments and constitutional amendments."
    }
  ],
  'GS Paper III': [
    {
      title: 'Economy & Tech',
      topics: [
        { id: 'e1', title: 'Indian Economy & Issues', isCompleted: false, isLocked: false },
        { id: 'e2', title: 'Environment & Biodiversity', isCompleted: false, isLocked: false },
        { id: 'e3', title: 'Science & Technology', isCompleted: false, isLocked: true },
        { id: 'e4', title: 'Internal Security & Disaster Management', isCompleted: false, isLocked: false },
      ],
      guidelines: "Economic Survey and Budget are essential. Focus on application of technology in governance."
    }
  ],
  'GS Paper IV': [
    {
      title: 'Ethics & Integrity',
      topics: [
        { id: 'et1', title: 'Ethics and Human Interface', isCompleted: false, isLocked: false },
        { id: 'et2', title: 'Attitude & Aptitude', isCompleted: false, isLocked: false },
        { id: 'et3', title: 'Case Studies', isCompleted: false, isLocked: true },
      ],
      guidelines: "Theoretical clarity is important, but case studies require a practical and ethical approach."
    }
  ]
};

export function Syllabus() {
  const [activePaper, setActivePaper] = useState('GS Paper I');
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);

  const pages = SYLLABUS_DATA[activePaper];

  const paginate = (newDirection: number) => {
    if (currentPage + newDirection >= 0 && currentPage + newDirection < pages.length) {
      setDirection(newDirection);
      setCurrentPage(currentPage + newDirection);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      rotateY: direction > 0 ? 90 : -90,
      opacity: 0,
      transformOrigin: direction > 0 ? 'left' : 'right',
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      transition: {
        duration: 0.6
      }
    },
    exit: (direction: number) => ({
      rotateY: direction < 0 ? 90 : -90,
      opacity: 0,
      transformOrigin: direction < 0 ? 'left' : 'right',
      transition: {
        duration: 0.6
      }
    })
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[40px] border border-[#5A5A40]/10 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-[#5A5A40] rounded-2xl shadow-lg relative overflow-hidden group">
                <Book className="text-white relative z-10" size={32} />
                <div className="absolute inset-0 bg-[#D4AF37]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#1a1a1a]">The Imperial Syllabus</h2>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4AF37]">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                  </svg>
                  <p className="text-[10px] text-[#5A5A40]/60 font-serif font-bold uppercase tracking-widest">Official UPSC Heritage Seal</p>
                </div>
              </div>
            </div>
        <div className="flex bg-[#f5f2ed] p-1.5 rounded-2xl border border-[#5A5A40]/10 overflow-x-auto max-w-full">
          {Object.keys(SYLLABUS_DATA).map((paper) => (
            <button
              key={paper}
              onClick={() => {
                setActivePaper(paper);
                setCurrentPage(0);
              }}
              className={`px-6 py-3 rounded-xl text-sm font-serif font-bold transition-all whitespace-nowrap ${
                activePaper === paper 
                  ? "bg-white text-[#5A5A40] shadow-md" 
                  : "text-[#5A5A40]/40 hover:text-[#5A5A40]"
              }`}
            >
              {paper}
            </button>
          ))}
        </div>
      </div>

      <div className="relative perspective-1000 h-[600px] flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={`${activePaper}-${currentPage}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute w-full max-w-3xl h-full bg-[#fcfaf7] rounded-r-[40px] rounded-l-lg shadow-2xl border-y border-r border-[#5A5A40]/20 overflow-hidden flex"
            style={{ 
              backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")',
              boxShadow: 'inset 20px 0 30px -10px rgba(0,0,0,0.1), 10px 10px 40px rgba(0,0,0,0.1)'
            }}
          >
            {/* Spine Shadow */}
            <div className="w-8 h-full bg-gradient-to-r from-black/10 to-transparent" />
            
            <div className="flex-1 p-12 flex flex-col">
              <div className="flex items-center justify-between mb-12">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#5A5A40]/40">Chapter {currentPage + 1}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#5A5A40]/40">{activePaper}</span>
              </div>

              <h3 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-8 border-b-2 border-[#5A5A40]/10 pb-4">
                {pages[currentPage].title}
              </h3>

              <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {pages[currentPage].topics.map((topic) => (
                  <div 
                    key={topic.id} 
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      topic.isLocked 
                        ? 'bg-gray-50/50 border-gray-100 opacity-60' 
                        : 'bg-white border-[#5A5A40]/5 hover:border-[#5A5A40]/20 hover:shadow-sm cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {topic.isCompleted ? (
                        <CheckCircle2 className="text-green-600" size={20} />
                      ) : (
                        <Circle className="text-[#5A5A40]/20" size={20} />
                      )}
                      <span className="font-serif text-[#1a1a1a]">{topic.title}</span>
                    </div>
                    {topic.isLocked && <Lock size={16} className="text-[#5A5A40]/40" />}
                  </div>
                ))}

                {(pages[currentPage] as any).guidelines && (
                  <div className="mt-8 p-6 bg-[#8B4513]/5 rounded-3xl border border-[#8B4513]/10">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#8B4513] mb-3 flex items-center gap-2">
                      <Sparkles size={14} />
                      Preparation Guidelines
                    </h4>
                    <p className="text-sm font-serif italic text-[#5A5A40] leading-relaxed">
                      {(pages[currentPage] as any).guidelines}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-12 flex items-center justify-between text-[#5A5A40]/40 font-serif italic text-sm">
                <span>Imperial Archives v1.0</span>
                <span>Page {currentPage + 1} of {pages.length}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none">
          <button
            onClick={() => paginate(-1)}
            disabled={currentPage === 0}
            className={`w-12 h-12 rounded-full bg-white shadow-lg border border-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] pointer-events-auto transition-all ${
              currentPage === 0 ? 'opacity-0' : 'hover:scale-110 active:scale-95'
            }`}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => paginate(1)}
            disabled={currentPage === pages.length - 1}
            className={`w-12 h-12 rounded-full bg-white shadow-lg border border-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] pointer-events-auto transition-all ${
              currentPage === pages.length - 1 ? 'opacity-0' : 'hover:scale-110 active:scale-95'
            }`}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="bg-[#5A5A40] p-8 rounded-[40px] text-white flex items-center justify-between shadow-xl">
        <div>
          <h4 className="text-xl font-serif font-bold mb-2">Mastery Progress</h4>
          <p className="text-white/60 text-sm font-serif italic">Your journey through the Imperial Archives</p>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-3xl font-serif font-bold">12%</p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">Overall</p>
          </div>
          <div className="h-12 w-[1px] bg-white/10" />
          <div className="text-center">
            <p className="text-3xl font-serif font-bold">4/32</p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">Topics</p>
          </div>
          <Button className="bg-white text-[#5A5A40] hover:bg-white/90 rounded-xl px-8 py-6 font-bold">
            Continue Journey
          </Button>
        </div>
      </div>
    </div>
  );
}
