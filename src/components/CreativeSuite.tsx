import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { supabase } from '../lib/supabase';
import { Save, Trash2, Download, Square, Circle, Type, MousePointer2, Pencil, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';

interface CreativeSuiteProps {
  userId: string;
}

export function CreativeSuite({ userId }: CreativeSuiteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'pencil' | 'rect' | 'circle' | 'text'>('select');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      const fbCanvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#02120b', // Dark Mode Green
      });
      setCanvas(fbCanvas);

      // Load existing state if any
      const loadState = async () => {
        const { data, error } = await supabase
          .storage
          .from('user_creative_assets')
          .download(`${userId}/latest_canvas.json`);
        
        if (!error && data) {
          const text = await data.text();
          fbCanvas.loadFromJSON(text, () => {
            fbCanvas.renderAll();
          });
        }
      };
      loadState();

      return () => {
        fbCanvas.dispose();
      };
    }
  }, [userId]);

  // Auto-save every 60 seconds
  useEffect(() => {
    if (!canvas) return;

    const interval = setInterval(() => {
      saveCanvas();
    }, 60000);

    return () => clearInterval(interval);
  }, [canvas]);

  const saveCanvas = async () => {
    if (!canvas || isSaving) return;
    setIsSaving(true);
    try {
      const json = JSON.stringify(canvas.toJSON());
      const blob = new Blob([json], { type: 'application/json' });
      
      await supabase
        .storage
        .from('user_creative_assets')
        .upload(`${userId}/latest_canvas.json`, blob, {
          upsert: true
        });
      
      console.log("Canvas auto-saved to Supabase.");
    } catch (error) {
      console.error("Canvas save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const setTool = (tool: 'select' | 'pencil' | 'rect' | 'circle' | 'text') => {
    if (!canvas) return;
    setActiveTool(tool);
    canvas.isDrawingMode = tool === 'pencil';
    if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = '#7FFFD4'; // Neon Mint
      canvas.freeDrawingBrush.width = 3;
      // Add glowing effect concept via shadow if supported in fabric brush
      (canvas.freeDrawingBrush as any).shadow = new fabric.Shadow({
        blur: 10,
        color: '#7FFFD4',
        offsetX: 0,
        offsetY: 0
      });
    }
  };

  const addRect = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: 'transparent',
      stroke: '#7FFFD4',
      strokeWidth: 2,
      width: 100,
      height: 100,
      shadow: new fabric.Shadow({ blur: 15, color: '#7FFFD4' })
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
      left: 150,
      top: 150,
      fill: 'transparent',
      stroke: '#7FFFD4',
      strokeWidth: 2,
      radius: 50,
      shadow: new fabric.Shadow({ blur: 15, color: '#7FFFD4' })
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
  };

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.Textbox('Drafting Intelligence...', {
      left: 200,
      top: 200,
      fontFamily: 'serif',
      fontSize: 24,
      fill: '#7FFFD4',
      shadow: new fabric.Shadow({ blur: 10, color: '#7FFFD4' })
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  };

  const clearCanvas = () => {
    if (canvas && confirm("Clear the Imperial Drafting Board?")) {
      canvas.clear();
      canvas.backgroundColor = '#02120b';
      canvas.renderAll();
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-[#0a2016] p-6 rounded-3xl border-2 border-[#7FFFD4]/20 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#7FFFD4]/10 rounded-xl">
            <ImageIcon className="text-[#7FFFD4]" size={24} />
          </div>
          <div>
            <h3 className="font-display font-bold text-[#7FFFD4]">Creative Suite</h3>
            <p className="text-[10px] uppercase tracking-widest text-[#7FFFD4]/40 font-bold">V-Digital Drafting Board</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={saveCanvas} disabled={isSaving} size="sm" className="bg-[#7FFFD4] text-[#02120b] hover:bg-[#6ee7b7] rounded-xl border-none">
            <Save size={16} className="mr-2" />
            {isSaving ? 'Archiving...' : 'Secure State'}
          </Button>
          <Button onClick={clearCanvas} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-2 p-2 bg-[#02120b] rounded-2xl border border-[#7FFFD4]/10">
          <button onClick={() => setTool('select')} className={`p-3 rounded-xl transition-all ${activeTool === 'select' ? 'bg-[#7FFFD4] text-[#02120b]' : 'text-[#7FFFD4]/40 hover:bg-[#7FFFD4]/5'}`}>
            <MousePointer2 size={20} />
          </button>
          <button onClick={() => setTool('pencil')} className={`p-3 rounded-xl transition-all ${activeTool === 'pencil' ? 'bg-[#7FFFD4] text-[#02120b]' : 'text-[#7FFFD4]/40 hover:bg-[#7FFFD4]/5'}`}>
            <Pencil size={20} />
          </button>
          <button onClick={addRect} className={`p-3 rounded-xl transition-all hover:bg-[#7FFFD4]/5 text-[#7FFFD4]/40`}>
            <Square size={20} />
          </button>
          <button onClick={addCircle} className={`p-3 rounded-xl transition-all hover:bg-[#7FFFD4]/5 text-[#7FFFD4]/40`}>
            <Circle size={20} />
          </button>
          <button onClick={addText} className={`p-3 rounded-xl transition-all hover:bg-[#7FFFD4]/5 text-[#7FFFD4]/40`}>
            <Type size={20} />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 rounded-2xl overflow-hidden border-2 border-[#7FFFD4]/30 shadow-[0_0_50px_-12px_rgba(127,255,212,0.3)] bg-[#02120b]">
           <canvas ref={canvasRef} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 mt-2">
         {[
           { label: 'Background', color: '#02120b' },
           { label: 'Drafting Lines', color: '#7FFFD4' },
           { label: 'Glow Intensity', value: 'High' }
         ].map((stat, i) => (
           <div key={i} className="flex flex-col items-center">
              <span className="text-[8px] uppercase tracking-widest text-[#7FFFD4]/30 font-bold mb-1">{stat.label}</span>
              {stat.color ? (
                <div className="w-4 h-4 rounded-full border border-[#7FFFD4]/20" style={{ backgroundColor: stat.color }} />
              ) : (
                <span className="text-xs font-serif text-[#7FFFD4]/60">{stat.value}</span>
              )}
           </div>
         ))}
      </div>
    </div>
  );
}
