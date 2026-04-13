import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { db, collection, query, onSnapshot, addDoc, serverTimestamp, OperationType, handleFirestoreError, updateDoc, doc, deleteDoc } from '../lib/firebase';
import { 
  FileText, 
  Download, 
  Plus, 
  Trash2, 
  PenTool, 
  Eraser, 
  Sparkles, 
  Type, 
  Save,
  Maximize2,
  Minimize2,
  Undo2,
  Layers,
  Search,
  Mic,
  Share2
} from 'lucide-react';
import { Button } from './ui/button';
import { jsPDF } from 'jspdf';
import { getStroke } from 'perfect-freehand';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

interface FolioProps {
  user: User;
}

interface Stroke {
  points: number[][];
  color: string;
  size: number;
  type: 'pen' | 'eraser';
}

export function Folio({ user }: FolioProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#5A5A40');
  const [size, setSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [title, setTitle] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [paperTemplate, setPaperTemplate] = useState<'blank' | 'ruled' | 'grid' | 'dotted'>('ruled');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  useEffect(() => {
    const path = `users/${user.uid || (user as any).id}/notes`;
    const q = query(collection(db, path));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [user.uid, (user as any).id]);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      try {
        const parsedStrokes = JSON.parse(activeNote.canvasData || '[]');
        setStrokes(parsedStrokes);
      } catch (e) {
        setStrokes([]);
      }
    } else {
      setTitle('');
      setStrokes([]);
      setAiSummary('');
    }
  }, [activeNote]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Paper Template
    ctx.strokeStyle = '#5A5A4011';
    ctx.lineWidth = 1;

    if (paperTemplate === 'ruled') {
      for (let i = 40; i < canvas.height; i += 32) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
    } else if (paperTemplate === 'grid') {
      for (let i = 0; i < canvas.width; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 32) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
    } else if (paperTemplate === 'dotted') {
      for (let x = 32; x < canvas.width; x += 32) {
        for (let y = 32; y < canvas.height; y += 32) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fillStyle = '#5A5A4022';
          ctx.fill();
        }
      }
    }

    // Draw Strokes
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    allStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      const outlinePoints = getStroke(stroke.points, {
        size: stroke.size,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      });

      ctx.beginPath();
      ctx.fillStyle = stroke.type === 'eraser' ? '#ffffff' : stroke.color;
      
      const pathData = getSvgPathFromStroke(outlinePoints);
      const path = new Path2D(pathData);
      ctx.fill(path);
    });
  }, [strokes, currentStroke, paperTemplate]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const getSvgPathFromStroke = (stroke: number[][]) => {
    if (!stroke.length) return "";

    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length];
        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        return acc;
      },
      ["M", ...stroke[0], "Q"]
    );

    d.push("Z");
    return d.join(" ");
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentStroke({
      points: [[x, y]],
      color,
      size,
      type: tool
    });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentStroke) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, [x, y]]
    });
  };

  const endDrawing = () => {
    if (currentStroke) {
      setStrokes([...strokes, currentStroke]);
    }
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  const saveNote = async () => {
    if (!title) return;
    const uid = user.uid || (user as any).id;
    const path = `users/${uid}/notes`;
    const canvasData = JSON.stringify(strokes);
    
    try {
      if (activeNote) {
        await updateDoc(doc(db, path, activeNote.id), {
          title,
          canvasData,
          updatedAt: serverTimestamp()
        });
      } else {
        const newDoc = await addDoc(collection(db, path), {
          title,
          canvasData,
          userId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setActiveNote({ id: newDoc.id, title, canvasData });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteNote = async (id: string) => {
    const uid = user.uid || (user as any).id;
    const path = `users/${uid}/notes`;
    try {
      await deleteDoc(doc(db, path, id));
      if (activeNote?.id === id) setActiveNote(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const runAIOCR = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsAIProcessing(true);
    try {
      const imageData = canvas.toDataURL('image/png').split(',')[1];
      
      const prompt = "Analyze this handwritten note. Extract the text and provide a structured summary of the key points. If there are diagrams, describe them.";
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { text: prompt },
          {
            inlineData: {
              data: imageData,
              mimeType: "image/png"
            }
          }
        ]
      });
      
      setAiSummary(response.text || "");
    } catch (error) {
      console.error("AI OCR Error:", error);
    } finally {
      setIsAIProcessing(false);
    }
  };

  const exportToPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const doc = new jsPDF();
    const imgData = canvas.toDataURL('image/png');
    
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.text(title.toUpperCase() || "UNTITLED FOLIO", 105, 20, { align: "center" });
    
    doc.addImage(imgData, 'PNG', 10, 30, 190, 250);
    
    if (aiSummary) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text("AI INTELLIGENT SUMMARY", 105, 20, { align: "center" });
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(aiSummary, 170);
      doc.text(splitText, 20, 40);
    }

    doc.save(`${title.replace(/\s+/g, '_')}_Folio.pdf`);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-[#5A5A40]/10 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <input 
            type="text"
            placeholder="Folio Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-serif font-bold text-[#1a1a1a] bg-transparent border-none outline-none placeholder:text-[#5A5A40]/20 w-64"
          />
          <div className="h-6 w-[1px] bg-[#5A5A40]/10" />
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTool('pen')}
              className={`p-2 rounded-xl transition-all ${tool === 'pen' ? 'bg-[#5A5A40] text-white shadow-md' : 'hover:bg-[#f5f2ed] text-[#5A5A40]'}`}
            >
              <PenTool size={18} />
            </button>
            <button 
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-[#5A5A40] text-white shadow-md' : 'hover:bg-[#f5f2ed] text-[#5A5A40]'}`}
            >
              <Eraser size={18} />
            </button>
            <div className="h-6 w-[1px] bg-[#5A5A40]/10 mx-2" />
            <div className="flex items-center gap-1">
              {['#5A5A40', '#1a1a1a', '#e11d48', '#2563eb', '#16a34a'].map(c => (
                <button 
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-[#5A5A40] scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="h-6 w-[1px] bg-[#5A5A40]/10 mx-2" />
            <select 
              value={paperTemplate}
              onChange={(e) => setPaperTemplate(e.target.value as any)}
              className="bg-[#f5f2ed] border-none rounded-lg px-2 py-1 text-xs font-serif text-[#5A5A40] outline-none"
            >
              <option value="blank">Blank</option>
              <option value="ruled">Ruled</option>
              <option value="grid">Grid</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={runAIOCR}
            disabled={isAIProcessing}
            className="bg-gradient-to-r from-[#5A5A40] to-[#1a1a1a] text-white rounded-xl px-4 shadow-md hover:shadow-lg transition-all"
          >
            <Sparkles size={16} className={`mr-2 ${isAIProcessing ? 'animate-spin' : ''}`} />
            {isAIProcessing ? 'Analyzing...' : 'AI Intelligence'}
          </Button>
          <Button 
            onClick={saveNote}
            className="bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 text-[#5A5A40] rounded-xl px-4"
          >
            <Save size={18} className="mr-2" />
            Save
          </Button>
          <Button 
            onClick={exportToPDF}
            className="bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 text-[#5A5A40] rounded-xl px-4"
          >
            <Download size={18} className="mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white rounded-3xl border border-[#5A5A40]/10 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#5A5A40]/5 flex items-center justify-between">
            <h3 className="font-serif font-bold text-sm text-[#5A5A40]">Archives</h3>
            <button onClick={() => setActiveNote(null)} className="p-1 hover:bg-[#f5f2ed] rounded-lg">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {notes.map(note => (
              <div key={note.id} className="group relative">
                <button 
                  onClick={() => setActiveNote(note)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${activeNote?.id === note.id ? 'bg-[#5A5A40] text-white shadow-md' : 'hover:bg-[#f5f2ed] text-[#5A5A40]'}`}
                >
                  <p className="text-xs font-serif font-bold truncate">{note.title}</p>
                  <p className={`text-[10px] mt-1 ${activeNote?.id === note.id ? 'text-white/60' : 'text-[#5A5A40]/40'}`}>
                    {new Date(note.updatedAt?.seconds * 1000).toLocaleDateString()}
                  </p>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div 
            ref={containerRef}
            className="flex-1 bg-white rounded-[40px] border border-[#5A5A40]/10 shadow-xl overflow-hidden relative cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
          >
            <canvas 
              ref={canvasRef}
              width={1200}
              height={2000}
              className="absolute top-0 left-0"
            />
            
            {/* Floating Controls */}
            <div className="absolute bottom-6 left-6 flex flex-col gap-2">
              <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-[#5A5A40]/10 shadow-lg flex flex-col gap-2">
                {[1, 3, 5, 8, 12].map(s => (
                  <button 
                    key={s}
                    onClick={() => setSize(s)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${size === s ? 'bg-[#5A5A40] text-white' : 'hover:bg-[#f5f2ed] text-[#5A5A40]'}`}
                  >
                    <div className="bg-current rounded-full" style={{ width: s, height: s }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="absolute top-6 right-6 flex gap-2">
              <button 
                onClick={() => setStrokes(strokes.slice(0, -1))}
                className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-[#5A5A40]/10 shadow-lg text-[#5A5A40] hover:bg-white transition-all"
              >
                <Undo2 size={20} />
              </button>
              <button 
                onClick={() => setStrokes([])}
                className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-[#5A5A40]/10 shadow-lg text-red-500 hover:bg-white transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          {/* AI Summary Panel */}
          <AnimatePresence>
            {aiSummary && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-[#1a1a1a] text-white p-6 rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-[#5A5A40]" />
                    <h4 className="font-serif font-bold text-sm uppercase tracking-widest">AI Intelligent Analysis</h4>
                  </div>
                  <button onClick={() => setAiSummary('')} className="text-white/40 hover:text-white">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="prose prose-invert prose-sm max-w-none font-serif italic text-white/80 leading-relaxed">
                  {aiSummary.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
