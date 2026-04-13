import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, Navigation, Info, Sparkles, MapPin, Compass, Layers, Wind, Droplets, Mountain } from 'lucide-react';
import { Button } from './ui/button';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';

// Custom Vintage Icon
const createVintageIcon = (color: string) => L.divIcon({
  html: `<svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 40 15 40C15 40 30 26.25 30 15C30 6.71573 23.2843 0 15 0Z" fill="${color}"/>
          <circle cx="15" cy="15" r="6" fill="#F5F2E7"/>
        </svg>`,
  className: 'vintage-marker',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -35]
});

const VintageIcon = createVintageIcon('#8B4513');
L.Marker.prototype.options.icon = VintageIcon;

interface CartographerProps {
  user: User;
}

const STRATEGIC_POINTS = [
  { 
    name: "Siachen Glacier", 
    coords: [35.4212, 77.1095], 
    info: "Highest battlefield in the world. Strategic for India-Pakistan relations.",
    upsc: "GS-I: Geography of Himalayas; GS-III: Internal Security & Border Management.",
    type: "strategic"
  },
  { 
    name: "Majuli Island", 
    coords: [26.9544, 94.1667], 
    info: "World's largest river island. Cultural and geographic significance in Assam.",
    upsc: "GS-I: Cultural Heritage; GI Tag: Majuli Mask Making, Majuli Manuscript Painting.",
    type: "river"
  },
  { 
    name: "Deccan Plateau", 
    coords: [17.1232, 76.1232], 
    info: "Large plateau in southern India. Formed by basaltic lava flows.",
    upsc: "GS-I: Physical Geography; Black Soil (Regur) significance for cotton cultivation.",
    type: "plateau"
  },
  { 
    name: "Ganga River Basin", 
    coords: [25.3176, 82.9739], 
    info: "Holistic river system supporting millions. Lifeline of North India.",
    upsc: "GS-I: Drainage Systems; GS-III: Namami Gange Project; Environmental flow.",
    type: "river"
  },
  { 
    name: "Malwa Plateau", 
    coords: [24.0, 76.0], 
    info: "Plateau region in west-central India. Known for its rolling hills.",
    upsc: "GS-I: Physiography of India; Chambal ravines (Badland Topography).",
    type: "plateau"
  },
  { 
    name: "Barren Island", 
    coords: [12.2783, 93.8583], 
    info: "Only active volcano in South Asia. Located in Andaman Sea.",
    upsc: "GS-I: Volcanism & Plate Tectonics; Strategic location in the Bay of Bengal.",
    type: "strategic"
  },
  { 
    name: "Pangong Tso", 
    coords: [33.7595, 78.6674], 
    info: "Strategic lake in Ladakh. Site of frequent border standoffs.",
    upsc: "GS-III: Border Security; Ramsar Site potential; Endorheic lake characteristics.",
    type: "strategic"
  },
  { 
    name: "Chota Nagpur Plateau", 
    coords: [23.0, 85.0], 
    info: "Mineral-rich region in eastern India. Heart of India's mineral wealth.",
    upsc: "GS-I: Distribution of Key Natural Resources; Iron & Steel Industry location factors.",
    type: "plateau"
  }
];

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 8);
  }, [center, map]);
  return null;
}

export function Cartographer({ user }: CartographerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'political' | 'physical' | 'rivers' | 'plateaus'>('political');

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      }
    } catch (error) {
      console.error("Search failed", error);
    }
  };

  const analyzeStrategicSignificance = async (lat?: number, lon?: number, name?: string) => {
    setIsAnalyzing(true);
    const targetLat = lat ?? center[0];
    const targetLon = lon ?? center[1];
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const prompt = `As a UPSC Geography and Strategic Expert, analyze the location at coordinates [${targetLat}, ${targetLon}] ${name ? `named ${name}` : ''}. 
      Provide a concise analysis (max 150 words) covering:
      1. Geographic significance (rivers, terrain, climate).
      2. Strategic/Security importance for India.
      3. Historical or UPSC-relevant facts (GI tags, treaties, conflicts).
      Format with clear headings.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      setAnalysis(response.text);
    } catch (error) {
      console.error("Analysis failed", error);
      setAnalysis("The Imperial archives are temporarily inaccessible. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Map Suite Sub-Nav */}
      <div className="flex bg-white border-2 border-saddle-brown/10 rounded-2xl p-1 self-start shadow-sm">
        {[
          { id: 'political', label: 'Political', icon: Layers },
          { id: 'physical', label: 'Physical', icon: Mountain },
          { id: 'rivers', label: 'River Systems', icon: Droplets },
          { id: 'plateaus', label: 'Plateaus', icon: Wind },
        ].map((layer) => (
          <button
            key={layer.id}
            onClick={() => setActiveLayer(layer.id as any)}
            className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeLayer === layer.id 
                ? 'bg-saddle-brown text-parchment shadow-md' 
                : 'text-saddle-brown/40 hover:text-saddle-brown'
            }`}
          >
            <layer.icon size={14} />
            {layer.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A5A40]/60" size={18} />
          <input 
            type="text"
            placeholder="Search for strategic locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-white border border-[#5A5A40]/20 rounded-2xl py-3 pl-12 pr-4 font-serif focus:ring-2 focus:ring-[#5A5A40] outline-none shadow-sm"
          />
        </div>
        <Button 
          onClick={handleSearch}
          className="bg-[#5A5A40] hover:bg-[#4A4A30] text-white rounded-2xl px-8 shadow-md"
        >
          Locate
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
        <div className="lg:col-span-3 bg-[#F5F2E7] rounded-3xl border-2 border-[#8B4513]/30 shadow-sm overflow-hidden relative scholar-map-container">
          <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%', background: '#F5F2E7', filter: 'sepia(0.3) contrast(1.1) brightness(0.95)' }} {...({ center, zoom: 5 } as any)}>
            <TileLayer
              url={activeLayer === 'physical' 
                ? "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
              }
              {...({ attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' } as any)}
            />
            
            {/* River Systems Animation Layer (Conceptual SVG Overlay) */}
            {activeLayer === 'rivers' && (
              <div className="absolute inset-0 z-[1000] pointer-events-none opacity-60 mix-blend-multiply">
                <svg width="100%" height="100%" viewBox="0 0 1000 1000" className="w-full h-full">
                  {/* Indus */}
                  <motion.path 
                    d="M250,150 Q300,250 280,350 T260,550" 
                    stroke="#229ED9" 
                    strokeWidth="4" 
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  {/* Ganga */}
                  <motion.path 
                    d="M350,250 Q450,350 550,400 T750,450" 
                    stroke="#229ED9" 
                    strokeWidth="6" 
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  />
                  {/* Brahmaputra */}
                  <motion.path 
                    d="M650,200 L800,230 Q850,300 800,400" 
                    stroke="#229ED9" 
                    strokeWidth="5" 
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 3.5, repeat: Infinity, delay: 2 }}
                  />
                  {/* Narmada */}
                  <motion.path 
                    d="M450,550 L300,580" 
                    stroke="#229ED9" 
                    strokeWidth="3" 
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  />
                  {/* Godavari */}
                  <motion.path 
                    d="M350,650 Q500,700 700,750" 
                    stroke="#229ED9" 
                    strokeWidth="4" 
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 5, repeat: Infinity, delay: 1.5 }}
                  />
                </svg>
              </div>
            )}

            {/* Plateau Formation Animation */}
            {activeLayer === 'plateaus' && (
              <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.3 }}
                  className="w-[500px] h-[500px] bg-[#8B4513] rounded-full blur-[120px] absolute top-[40%] left-[30%]"
                />
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.2 }}
                  className="w-[300px] h-[300px] bg-[#D4AF37] rounded-full blur-[80px] absolute top-[20%] left-[60%]"
                />
              </div>
            )}
            <MapUpdater center={center} />
            {STRATEGIC_POINTS.map((point, idx) => (
              <Marker 
                key={idx} 
                position={point.coords as [number, number]}
                eventHandlers={{
                  click: () => {
                    setCenter(point.coords as [number, number]);
                    analyzeStrategicSignificance(point.coords[0], point.coords[1], point.name);
                  },
                }}
              >
                <Popup>
                  <div className="font-serif p-1 min-w-[180px]">
                    <h4 className="font-bold text-[#5A5A40] border-b border-[#5A5A40]/10 pb-1 mb-2">{point.name}</h4>
                    <p className="text-[11px] italic text-gray-600 mb-2 leading-tight">{point.info}</p>
                    <div className="bg-[#5A5A40]/5 p-2 rounded-lg border border-[#5A5A40]/10">
                      <p className="text-[9px] font-bold text-[#5A5A40] uppercase tracking-widest mb-1">UPSC Context</p>
                      <p className="text-[10px] leading-relaxed">{(point as any).upsc}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        analyzeStrategicSignificance(point.coords[0], point.coords[1], point.name);
                      }}
                      className="mt-3 w-full py-2 bg-[#5A5A40] text-white text-[10px] rounded-lg hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-2"
                    >
                      <Compass size={10} />
                      Deep Analysis
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          <div className="absolute bottom-6 right-6 z-[1000]">
            <Button 
              onClick={() => analyzeStrategicSignificance()}
              disabled={isAnalyzing}
              className="bg-white/90 backdrop-blur-md text-[#5A5A40] border border-[#5A5A40]/20 hover:bg-white rounded-full px-6 py-6 shadow-xl flex items-center gap-2"
            >
              <Sparkles size={18} className={isAnalyzing ? "animate-spin" : ""} />
              {isAnalyzing ? "Analyzing..." : "AI Strategic Analysis"}
            </Button>
          </div>
        </div>

        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white p-6 rounded-3xl border border-[#5A5A40]/10 shadow-sm">
            <h3 className="font-serif font-bold text-[#5A5A40] mb-4 flex items-center gap-2">
              <Navigation size={18} />
              Strategic Points
            </h3>
            <div className="space-y-3">
              {STRATEGIC_POINTS.map((point, idx) => (
                <button
                  key={idx}
                  onClick={() => setCenter(point.coords as [number, number])}
                  className="w-full text-left p-3 rounded-xl hover:bg-[#f5f2ed] transition-colors group"
                >
                  <p className="font-serif font-bold text-sm group-hover:text-[#5A5A40]">{point.name}</p>
                  <p className="text-[10px] text-[#5A5A40]/60 uppercase tracking-tighter">Quick Jump</p>
                </button>
              ))}
            </div>
          </div>

          {analysis && (
            <div className="bg-[#5A5A40] text-white p-6 rounded-3xl shadow-lg border border-white/10">
              <h3 className="font-serif font-bold mb-3 flex items-center gap-2">
                <Info size={18} />
                Strategic Insight
              </h3>
              <div className="text-xs font-serif leading-relaxed opacity-90 whitespace-pre-wrap">
                {analysis}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .scholar-map-container .leaflet-tile-pane {
          filter: sepia(0.5) contrast(0.9) brightness(1.1) grayscale(0.2);
        }
        .scholar-map-container::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.05;
          z-index: 400;
        }
        .vintage-marker {
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
        }
      `}</style>
    </div>
  );
}
