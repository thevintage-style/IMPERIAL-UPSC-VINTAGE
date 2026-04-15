import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  deleteDoc,
  getDocs,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Book, 
  Table, 
  PenTool, 
  Sparkles, 
  Save, 
  Trash2, 
  Download, 
  ChevronRight, 
  ChevronLeft,
  Eraser,
  Palette,
  Type,
  Maximize2,
  Settings,
  RefreshCw,
  FileText,
  AlertCircle,
  X,
  CheckCircle2,
  Trash,
  Plus
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { jsPDF } from "jspdf";
import { getStroke } from 'perfect-freehand';

const ai = new GoogleGenAI({ apiKey: process.env.VINTAGE_ORACLE_KEY || "" });

interface LogEntry {
  id?: string;
  userId: string;
  title: string;
  journalData: string;
  sheetData: string;
  canvasData: string;
  aiSummary: string;
  createdAt: any;
}

interface FolioProps {
  user: User;
}

export function Folio({ user }: FolioProps) {
  const [activeModule, setActiveModule] = useState<'journal' | 'sheet' | 'canvas'>('journal');
  const [currentLog, setCurrentLog] = useState<LogEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Module States
  const [journalText, setJournalText] = useState('');
  const [sheetRows, setSheetRows] = useState<{ time: string, topic: string, status: string }[]>([
    { time: '06:00 - 08:00', topic: 'Ancient History', status: 'Completed' }
  ]);
  const [strokes, setStrokes] = useState<any[]>([]);
  const [currentStroke, setCurrentStroke] = useState<any>(null);
  const [penColor, setPenColor] = useState('#8B4513');
  const [penSize, setPenSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  const canvasRef = useRef<SVGSVGElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  // Load Latest Log on Mount
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, `users/${user.uid}/notes`),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data() as LogEntry;
        const logId = snapshot.docs[0].id;
        
        // Only update local state if this is the first load or a new log is created
        if (isInitialLoad.current || (currentLog && currentLog.id !== logId)) {
          setCurrentLog({ ...docData, id: logId });
          setJournalText(docData.journalData || '');
          try {
            setSheetRows(JSON.parse(docData.sheetData || '[]'));
          } catch (e) { console.error("Sheet parse error", e); }
          try {
            setStrokes(JSON.parse(docData.canvasData || '[]'));
          } catch (e) { console.error("Canvas parse error", e); }
          isInitialLoad.current = false;
        }
      } else {
        // No logs found, start fresh
        setCurrentLog(null);
        setJournalText('');
        setSheetRows([]);
        setStrokes([]);
        isInitialLoad.current = false;
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notes`);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Auto-save Logic
  useEffect(() => {
    if (isInitialLoad.current) return;
    
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [journalText, sheetRows, strokes]);

  const handleSave = async (isAuto = false) => {
    if (!user?.uid) return;
    if (!isAuto) setIsSaving(true);

    try {
      const logData = {
        userId: user.uid,
        title: `Imperial Log - ${new Date().toLocaleDateString()}`,
        journalData: journalText,
        sheetData: JSON.stringify(sheetRows),
        canvasData: JSON.stringify(strokes),
        aiSummary: currentLog?.aiSummary || '',
        createdAt: currentLog?.createdAt || serverTimestamp()
      };

      if (currentLog?.id) {
        await updateDoc(doc(db, `users/${user.uid}/notes`, currentLog.id), logData);
      } else {
        const docRef = await addDoc(collection(db, `users/${user.uid}/notes`), logData);
        setCurrentLog({ ...logData, id: docRef.id });
      }

      if (!isAuto) setStatus({ type: 'success', message: "Imperial Log safely archived." });
    } catch (error) {
      console.error("Save Error:", error);
      if (!isAuto) setStatus({ type: 'error', message: "The archives are currently sealed. Could not save." });
    } finally {
      if (!isAuto) setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!user?.uid) return;
    try {
      const q = query(collection(db, `users/${user.uid}/notes`));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      
      setJournalText('');
      setSheetRows([]);
      setStrokes([]);
      setCurrentLog(null);
      setStatus({ type: 'success', message: "All Imperial Logs have been purged." });
      setConfirmClearAll(false);
      setShowSettings(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/notes`);
    }
  };

  const runAIAnalysis = async () => {
    if (!process.env.VINTAGE_ORACLE_KEY || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const aiResult = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: `
        As the Imperial Scholar, analyze this UPSC aspirant's daily log:
        
        Journal: ${journalText}
        Study Hours: ${sheetRows.map(r => `${r.time}: ${r.topic} (${r.status})`).join(', ')}
        
        Provide:
        1. A 'Smart Summary' of the day's progress.
        2. Three 'Contextual Suggestions' for UPSC Mains answer writing based on these topics.
        3. A motivational quote from an Indian leader.
        
        Format as clean Markdown.
      ` }] }]
      });
      const text = aiResult.text;
      
      if (currentLog?.id) {
        await updateDoc(doc(db, `users/${user.uid}/notes`, currentLog.id), {
          aiSummary: text
        });
      }
      
      setCurrentLog(prev => prev ? { ...prev, aiSummary: text } : null);
      setStatus({ type: 'success', message: "The Oracle has spoken. Analysis complete." });
    } catch (error) {
      console.error("AI Error:", error);
      setStatus({ type: 'error', message: "The Oracle is silent. Check your connection." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Canvas Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentStroke({ points: [[x, y, e.pressure]], color: isEraser ? '#F5F2E7' : penColor, size: penSize });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!currentStroke) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentStroke({ ...currentStroke, points: [...currentStroke.points, [x, y, e.pressure]] });
  };

  const handlePointerUp = () => {
    if (currentStroke) {
      setStrokes([...strokes, currentStroke]);
      setCurrentStroke(null);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 relative">
      {/* 2D Bronze Sticker - Top Right */}
      <div className="absolute top-[-20px] right-[-20px] z-50 p-[30px]">
        <div className="relative group">
          <div className="w-24 h-24 bg-[#D4AF37] rounded-full border-4 border-white shadow-[0_0_0_2px_rgba(139,69,19,0.2)] flex flex-col items-center justify-center text-center p-2 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
            <span className="text-[8px] font-bold text-leather uppercase tracking-tighter leading-none">Iron Man</span>
            <span className="text-[10px] font-display font-black text-leather uppercase leading-none">OF INDIA</span>
            <div className="w-8 h-0.5 bg-leather/20 my-1" />
            <span className="text-[6px] font-serif italic text-leather/60">Imperial Seal</span>
          </div>
          {/* Die-cut white border effect */}
          <div className="absolute inset-[-4px] border-4 border-white rounded-full -z-10 shadow-lg" />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-leather rounded-2xl shadow-xl border-2 border-antique-gold/30">
            <Book className="text-antique-gold" size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-bold text-leather tracking-tight">Imperial Folio</h2>
            <p className="text-sm font-serif italic text-saddle-brown">The Master's Workspace • IRON MAN OF INDIA</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => handleSave()}
            disabled={isSaving}
            className="bg-saddle-brown text-parchment hover:bg-leather rounded-xl shadow-lg border border-antique-gold/20"
          >
            {isSaving ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
            {isSaving ? 'Archiving...' : 'Save Log'}
          </Button>
          <Button 
            onClick={() => setShowSettings(!showSettings)}
            variant="ghost"
            className="p-3 bg-leather/5 text-saddle-brown hover:bg-leather/10 rounded-xl"
          >
            <Settings size={20} />
          </Button>
        </div>
      </div>

      {/* Settings Dropdown */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 right-0 z-40 w-64 parchment-card p-4 shadow-2xl border-2 border-saddle-brown/20"
          >
            <h4 className="text-xs font-bold uppercase tracking-widest text-leather mb-4 border-b border-saddle-brown/10 pb-2">Folio Settings</h4>
            <div className="space-y-2">
              <button 
                onClick={() => setConfirmClearAll(true)}
                className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold"
              >
                <Trash2 size={16} />
                Purge All Logs
              </button>
              <button 
                onClick={() => {
                  setJournalText('');
                  setSheetRows([]);
                  setStrokes([]);
                  setShowSettings(false);
                }}
                className="w-full flex items-center gap-3 p-3 text-saddle-brown hover:bg-leather/5 rounded-xl transition-colors text-sm font-bold"
              >
                <RefreshCw size={16} />
                Reset Current View
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {confirmClearAll && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-[32px] border-2 border-red-100 shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Purge All Logs?</h3>
              <p className="text-sm text-gray-500 font-serif italic mb-8">This action cannot be undone. All your historical logs will be permanently removed from the Imperial Archives.</p>
              <div className="flex gap-3">
                <Button onClick={() => setConfirmClearAll(false)} variant="ghost" className="flex-1 rounded-xl">Cancel</Button>
                <Button onClick={handleClearAll} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl">Purge</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Workspace */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Module Selector Sidebar */}
        <div className="w-20 flex flex-col gap-4">
          {[
            { id: 'journal', icon: FileText, label: 'Journal' },
            { id: 'sheet', icon: Table, label: 'Log' },
            { id: 'canvas', icon: PenTool, label: 'Canvas' }
          ].map((mod) => (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id as any)}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all border-2 ${
                activeModule === mod.id 
                  ? 'bg-saddle-brown text-parchment border-antique-gold shadow-xl scale-105' 
                  : 'bg-white text-saddle-brown border-saddle-brown/10 hover:border-antique-gold/50'
              }`}
            >
              <mod.icon size={24} />
              <span className="text-[10px] font-bold uppercase tracking-tighter mt-2">{mod.label}</span>
            </button>
          ))}
        </div>

        {/* Active Module Content */}
        <div className="flex-1 parchment-card flex flex-col overflow-hidden relative border-2 border-saddle-brown/20 shadow-2xl">
          {/* Module Header */}
          <div className="p-4 border-b border-saddle-brown/10 bg-leather/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-antique-gold rounded-full animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-leather/60">
                {activeModule === 'journal' ? 'Digital Journal' : activeModule === 'sheet' ? 'Study Log Sheet' : 'Imperial Canvas'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-serif italic text-saddle-brown/40">Auto-saving...</span>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">
            {activeModule === 'journal' && (
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Record your daily strategy and reflections..."
                className="w-full h-full p-10 bg-transparent font-serif text-lg leading-relaxed text-leather outline-none resize-none custom-scrollbar placeholder:text-saddle-brown/20"
                style={{ backgroundImage: 'linear-gradient(#eee 1px, transparent 1px)', backgroundSize: '100% 2rem' }}
              />
            )}

            {activeModule === 'sheet' && (
              <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-saddle-brown/20">
                      <th className="text-left p-4 font-display font-bold text-saddle-brown uppercase tracking-widest text-xs">Time Slot</th>
                      <th className="text-left p-4 font-display font-bold text-saddle-brown uppercase tracking-widest text-xs">Topic / Subject</th>
                      <th className="text-left p-4 font-display font-bold text-saddle-brown uppercase tracking-widest text-xs">Status</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-saddle-brown/10">
                    {sheetRows.map((row, i) => (
                      <tr key={i} className="group hover:bg-leather/5 transition-colors">
                        <td className="p-2">
                          <input 
                            value={row.time}
                            onChange={(e) => {
                              const newRows = [...sheetRows];
                              newRows[i].time = e.target.value;
                              setSheetRows(newRows);
                            }}
                            className="w-full bg-transparent p-2 font-serif text-leather outline-none focus:bg-white rounded-lg"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            value={row.topic}
                            onChange={(e) => {
                              const newRows = [...sheetRows];
                              newRows[i].topic = e.target.value;
                              setSheetRows(newRows);
                            }}
                            className="w-full bg-transparent p-2 font-serif text-leather outline-none focus:bg-white rounded-lg"
                          />
                        </td>
                        <td className="p-2">
                          <select 
                            value={row.status}
                            onChange={(e) => {
                              const newRows = [...sheetRows];
                              newRows[i].status = e.target.value;
                              setSheetRows(newRows);
                            }}
                            className="w-full bg-transparent p-2 font-serif text-leather outline-none focus:bg-white rounded-lg appearance-none"
                          >
                            <option>Pending</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option>Revised</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <button 
                            onClick={() => setSheetRows(sheetRows.filter((_, idx) => idx !== i))}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-2"
                          >
                            <Trash size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button 
                  onClick={() => setSheetRows([...sheetRows, { time: '', topic: '', status: 'Pending' }])}
                  variant="ghost"
                  className="mt-6 w-full border-2 border-dashed border-saddle-brown/20 text-saddle-brown hover:bg-leather/5 rounded-2xl py-8"
                >
                  <Plus className="mr-2" size={16} />
                  Add Study Session
                </Button>
              </div>
            )}

            {activeModule === 'canvas' && (
              <div className="h-full flex flex-col">
                {/* Canvas Toolbar */}
                <div className="p-3 bg-leather/5 border-b border-saddle-brown/10 flex items-center gap-4">
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-saddle-brown/10">
                    <button 
                      onClick={() => setIsEraser(false)}
                      className={`p-2 rounded-lg transition-colors ${!isEraser ? 'bg-saddle-brown text-parchment' : 'hover:bg-leather/5'}`}
                    >
                      <PenTool size={16} />
                    </button>
                    <button 
                      onClick={() => setIsEraser(true)}
                      className={`p-2 rounded-lg transition-colors ${isEraser ? 'bg-saddle-brown text-parchment' : 'hover:bg-leather/5'}`}
                    >
                      <Eraser size={16} />
                    </button>
                  </div>
                  
                  <div className="h-6 w-px bg-saddle-brown/10" />
                  
                  <div className="flex items-center gap-2">
                    {['#8B4513', '#D4AF37', '#1A1612', '#B22222', '#2E8B57'].map(color => (
                      <button
                        key={color}
                        onClick={() => { setPenColor(color); setIsEraser(false); }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${penColor === color && !isEraser ? 'border-antique-gold scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div className="h-6 w-px bg-saddle-brown/10" />

                  <input 
                    type="range" min="1" max="20" 
                    value={penSize} 
                    onChange={(e) => setPenSize(parseInt(e.target.value))}
                    className="w-24 accent-saddle-brown"
                  />

                  <button 
                    onClick={() => setStrokes([])}
                    className="ml-auto text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700"
                  >
                    Clear Canvas
                  </button>
                </div>

                <div className="flex-1 relative cursor-crosshair overflow-hidden">
                  <svg
                    ref={canvasRef}
                    className="w-full h-full touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    style={{ backgroundImage: 'radial-gradient(#8B4513 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}
                  >
                    {strokes.map((stroke, i) => (
                      <path
                        key={i}
                        d={getSvgPathFromStroke(getStroke(stroke.points, { size: stroke.size }))}
                        fill={stroke.color}
                      />
                    ))}
                    {currentStroke && (
                      <path
                        d={getSvgPathFromStroke(getStroke(currentStroke.points, { size: currentStroke.size }))}
                        fill={currentStroke.color}
                      />
                    )}
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="w-96 flex flex-col gap-6">
          <div className="parchment-card p-6 flex-1 flex flex-col border-2 border-saddle-brown/20 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-leather flex items-center gap-2">
                <Sparkles className="text-antique-gold" size={18} />
                Oracle Insights
              </h3>
              <Button 
                onClick={runAIAnalysis}
                disabled={isAnalyzing || !journalText}
                className="bg-antique-gold text-leather hover:bg-antique-gold/80 rounded-xl text-[10px] font-bold uppercase tracking-widest py-1 h-8"
              >
                {isAnalyzing ? <RefreshCw className="animate-spin mr-2" size={12} /> : <Sparkles size={12} className="mr-2" />}
                Analyze
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {currentLog?.aiSummary ? (
                <div className="prose prose-sm font-serif italic text-leather/80 leading-relaxed">
                  <ReactMarkdown>{currentLog.aiSummary}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 grayscale">
                  <Sparkles size={48} className="mb-4" />
                  <p className="font-serif italic">"The Oracle awaits your daily reflections to provide scholarly guidance."</p>
                </div>
              )}
            </div>
          </div>

          <div className="parchment-card p-6 border-2 border-saddle-brown/20 shadow-xl">
            <h3 className="font-display font-bold text-leather mb-4 flex items-center gap-2">
              <Download size={18} className="text-saddle-brown" />
              Archives
            </h3>
            <div className="space-y-3">
              <Button className="w-full bg-leather/5 text-saddle-brown hover:bg-leather/10 rounded-xl justify-start font-serif italic text-sm">
                <FileText size={16} className="mr-3" />
                Export as Imperial PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Notifications */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 right-8 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-md ${
              status.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              status.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <p className="text-sm font-serif font-medium">{status.message}</p>
            <button onClick={() => setStatus(null)} className="ml-auto p-1 hover:bg-black/5 rounded-lg">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getSvgPathFromStroke(stroke: any) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc: any, [x0, y0]: any, i: any, arr: any) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}
