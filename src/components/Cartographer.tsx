import React, { useState, useEffect, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, Navigation, Info, Sparkles, MapPin, Compass, Layers, Wind, Droplets, Mountain, Save, Edit3, Loader2, ArrowLeft, X } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';

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
const SavedMarkerIcon = createVintageIcon('#D4AF37');
const SelectedIcon = createVintageIcon('#A52A2A');
L.Marker.prototype.options.icon = VintageIcon;

interface CartographerProps {
  user: SupabaseUser;
}

interface CustomMarker {
  id: string;
  lat: number;
  lon: number;
  name?: string;
  annotation?: string;
  analysis?: string;
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
  },
  {
    name: "Western Ghats (Sahyadris)",
    coords: [14.0, 74.0],
    info: "Mountain range along the western coast. Global biodiversity hotspot.",
    upsc: "GS-I: Physical Geography; GS-III: Environment; Kasturirangan & Madhav Gadgil Reports.",
    type: "strategic"
  },
  {
    name: "Narmada River",
    coords: [21.7, 72.8],
    info: "Fifth largest river and largest west flowing river. Flows in a rift valley.",
    upsc: "GS-I: Drainage Systems; Sardar Sarovar Dam (Multipurpose project); Narmada Bachao Andolan.",
    type: "river"
  },
  {
    name: "Sundarbans Delta",
    coords: [21.9, 88.8],
    info: "World's largest mangrove forest. UNESCO World Heritage site.",
    upsc: "GS-I: Biogeography; GS-III: Climate Change; Royal Bengal Tigers habitat.",
    type: "river"
  }
];

function MapUpdater({ center, onMapClick }: { center: [number, number], onMapClick: (lat: number, lon: number) => void }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 8);
  }, [center, map]);

  useEffect(() => {
    map.on('click', (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });
    return () => {
      map.off('click');
    };
  }, [map, onMapClick]);

  return null;
}

export function Cartographer({ user }: CartographerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState<'political' | 'physical' | 'indian'>('political');
  const [overlays, setOverlays] = useState({ rivers: false, plains: false, plateaus: false });
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savedMarkers, setSavedMarkers] = useState<CustomMarker[]>([]);
  const [annotation, setAnnotation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const userId = user.id;

  // Load locations from Supabase map_locations table
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('map_locations')
          .select('*');
        
        if (!error && data) {
          setLocations(data);
        } else {
          // Fallback to hardcoded if table doesn't exist or is empty
          setLocations(STRATEGIC_POINTS);
        }
      } catch (err) {
        console.error("Error fetching map locations:", err);
        setLocations(STRATEGIC_POINTS);
      }
    };
    fetchLocations();
  }, []);

  // Load saved markers from Supabase
  useEffect(() => {
    if (!userId) return;
    const fetchMarkers = async () => {
      try {
        const { data, error } = await supabase
          .from('map_markers')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const markers = (data || []).map(m => ({
          id: m.id,
          lat: m.lat,
          lon: m.lon,
          name: m.title.replace('Strategic Point: ', ''),
          annotation: m.annotation,
          analysis: m.content
        } as CustomMarker));
        
        setSavedMarkers(markers);
      } catch (error) {
        console.error("Error fetching map archives:", error);
      }
    };
    fetchMarkers();
  }, [userId]);

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

  const analyzeStrategicSignificance = async (lat?: number, lon?: number, name?: string, detailed = false) => {
    setIsAnalyzing(true);
    const targetLat = lat ?? center[0];
    const targetLon = lon ?? center[1];

    try {
      const response = await fetch('/api/oracle/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: detailed 
            ? `As a Senior UPSC Scholar and Strategic Analyst, provide an EXHAUSTIVE deep-dive analysis for the location at [${targetLat}, ${targetLon}] ${name ? `named ${name}` : ''}.
               Cover the following in great detail:
               1. PHYSIOGRAPHY: Detailed terrain, soil types, drainage patterns, and climatic influences.
               2. STRATEGIC DEPTH: Military significance, border dynamics, and regional power play.
               3. ECONOMIC GEOGRAPHY: Resource potential, infrastructure projects (Gati Shakti, etc.), and local industries.
               4. HISTORICAL CONTEXT: Ancient to modern significance, relevant treaties, and cultural heritage.
               5. UPSC SYLLABUS LINKAGE: Explicitly link to GS Paper I, II, and III topics.
               Use a scholarly, sophisticated tone. Format with clear, bold headings and bullet points.`
            : `As a UPSC Geography and Strategic Expert, analyze the location at coordinates [${targetLat}, ${targetLon}] ${name ? `named ${name}` : ''}. 
               Provide a concise analysis (max 150 words) covering:
               1. Geographic significance (rivers, terrain, climate).
               2. Strategic/Security importance for India.
               3. Historical or UPSC-relevant facts (GI tags, treaties, conflicts).
               Format with clear headings.`,
          systemInstruction: "You are the Imperial Cartographer Analysis Engine."
        })
      });

      if (!response.ok) throw new Error("Oracle failed to respond.");
      const data = await response.json();
      setAnalysis(data.text || "The Imperial archives are temporarily inaccessible.");
    } catch (error) {
      console.error("Analysis failed", error);
      setAnalysis("The Imperial archives are temporarily inaccessible. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToVault = async () => {
    if (!selectedPoint) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        window.alert("Please log in before saving items.");
        return;
      }

      const markerName = selectedPoint.name || `Point ${selectedPoint.lat.toFixed(2)}, ${selectedPoint.lon.toFixed(2)}`;
      
      const markerData = {
        title: `Strategic Point: ${markerName}`,
        lat: selectedPoint.lat,
        lon: selectedPoint.lon,
        annotation: annotation,
        content: analysis || 'No analysis available.',
        // Relying on auth.uid() in DB for user_id
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('map_markers')
        .insert([markerData])
        .select()
        .single();

      if (error) throw error;

      setSavedMarkers(prev => [{
        id: data.id,
        lat: selectedPoint.lat,
        lon: selectedPoint.lon,
        name: markerName,
        annotation: annotation,
        analysis: analysis || ''
      }, ...prev]);

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error("Error saving to Imperial Vault:", error);
      setSaveStatus('error');
      window.alert(`Database Error: ${error.message || error}`);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Map Suite Sub-Nav */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex bg-white border-2 border-saddle-brown/10 rounded-2xl p-1 shadow-sm">
          {[
            { id: 'political', label: 'Political Map', icon: Layers },
            { id: 'physical', label: 'Physical Map', icon: Mountain },
            { id: 'indian', label: 'Indian Map', icon: Compass },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setMapType(type.id as any);
                if (type.id === 'indian') {
                  setCenter([22.9734, 78.6569]); // Center of India
                }
              }}
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                mapType === type.id 
                  ? 'bg-saddle-brown text-parchment shadow-md' 
                  : 'text-saddle-brown/40 hover:text-saddle-brown'
              }`}
            >
              <type.icon size={14} />
              {type.label}
            </button>
          ))}
        </div>

        {mapType === 'political' && (
          <div className="flex bg-antique-gold/10 border-2 border-antique-gold/20 rounded-2xl p-1 shadow-sm">
             <span className="px-3 py-2 text-[10px] font-bold text-saddle-brown/60 uppercase flex items-center gap-1 border-r border-antique-gold/20 mr-1">
               <Layers size={12} /> Overlays
             </span>
             {[
              { id: 'rivers', label: 'Rivers', icon: Droplets },
              { id: 'plains', label: 'Plains', icon: Wind },
              { id: 'plateaus', label: 'Plateaus', icon: Mountain },
            ].map((overlay) => (
              <button
                key={overlay.id}
                onClick={() => setOverlays(prev => ({ ...prev, [overlay.id]: !prev[overlay.id as keyof typeof prev] }))}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                  overlays[overlay.id as keyof typeof overlays]
                    ? 'bg-antique-gold text-leather shadow-sm' 
                    : 'text-saddle-brown/40 hover:text-saddle-brown'
                }`}
              >
                <overlay.icon size={12} />
                {overlay.label}
              </button>
            ))}
          </div>
        )}
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
          {(MapContainer as any) && (
            <MapContainer 
              center={center} 
              zoom={5} 
              style={{ height: '100%', width: '100%', background: '#F5F2E7' } as any}
              {...({ center, zoom: 5 } as any)}
            >
              <TileLayer
                url={
                  mapType === 'physical' 
                    ? "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
                {...({ attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } as any)}
              />
              
              <MapUpdater center={mapType === 'indian' ? [22.9734, 78.6569] : center} onMapClick={(lat, lon) => {
                setCenter([lat, lon]);
                setSelectedPoint({ lat, lon, name: "Surveyed Point" });
                setAnnotation('');
                analyzeStrategicSignificance(lat, lon);
                setIsSidebarOpen(true);
              }} />
              {locations.map((point: any, idx: number) => (
                <Marker 
                  key={`loc-${idx}`} 
                  position={point.coords as [number, number]}
                  {...({ icon: VintageIcon } as any)}
                  eventHandlers={{
                    click: () => {
                      setCenter(point.coords as [number, number]);
                      setSelectedPoint(point);
                      setIsSidebarOpen(true);
                      analyzeStrategicSignificance(point.coords[0], point.coords[1], point.name);
                    },
                  }}
                >
                  <Popup>
                    <div className="vintage-popup rounded-2xl font-serif p-2 min-w-[200px] text-leather">
                      <h4 className="font-bold text-saddle-brown mb-1">{point.name}</h4>
                      <p className="text-[10px] italic opacity-70 mb-2">{point.info || point.history}</p>
                      <Button 
                        size="sm" 
                        className="w-full bg-antique-gold/20 text-saddle-brown border border-antique-gold/30 text-[10px] font-bold uppercase rounded-lg hover:bg-antique-gold/30"
                        onClick={() => {
                          setSelectedPoint(point);
                          setIsSidebarOpen(true);
                          analyzeStrategicSignificance(point.coords[0], point.coords[1], point.name, true);
                        }}
                      >
                        Consult Oracle AI
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
              {/* Saved Custom Markers */}
              {savedMarkers.map((marker) => (
                <Marker 
                  key={`saved-${marker.id}`} 
                  position={[marker.lat, marker.lon]} 
                  {...({ icon: SavedMarkerIcon } as any)}
                  eventHandlers={{
                    click: () => {
                      setSelectedPoint({ lat: marker.lat, lon: marker.lon, name: marker.name });
                      setAnnotation(marker.annotation || '');
                      setAnalysis(marker.analysis || '');
                    }
                  }}
                >
                  <Popup>
                    <div className="font-serif p-2 min-w-[240px] bg-parchment border-2 border-saddle-brown/20 rounded-xl shadow-xl text-leather">
                      <h4 className="font-bold text-sm border-b border-saddle-brown/10 pb-2 mb-2">Archived Strategic Point</h4>
                      <p className="text-xs font-bold text-saddle-brown mb-1">{marker.name}</p>
                      <p className="text-[10px] opacity-60 mb-2 truncate">{marker.annotation}</p>
                      <button 
                        onClick={() => {
                          setSelectedPoint({ lat: marker.lat, lon: marker.lon, name: marker.name });
                          setAnnotation(marker.annotation || '');
                          setAnalysis(marker.analysis || '');
                        }}
                        className="w-full py-2 bg-antique-gold/20 text-saddle-brown text-[10px] font-bold uppercase rounded-lg"
                      >
                        Retrieve Data
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {selectedPoint && !locations.some(p => p.coords[0] === selectedPoint.lat && p.coords[1] === selectedPoint.lon) && !savedMarkers.some(m => m.lat === selectedPoint.lat && m.lon === selectedPoint.lon) && (
                <Marker position={[selectedPoint.lat, selectedPoint.lon]} {...({ icon: SelectedIcon } as any)}>
                  <Popup>
                    <div className="font-serif p-2 min-w-[240px] bg-parchment border-2 border-saddle-brown/20 rounded-xl shadow-xl">
                      <h4 className="font-bold text-leather text-sm border-b border-saddle-brown/10 pb-2 mb-2">Custom Strategic Point</h4>
                      <p className="text-[10px] text-leather/60 mb-3">Coordinates: {selectedPoint.lat.toFixed(4)}, {selectedPoint.lon.toFixed(4)}</p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          analyzeStrategicSignificance(selectedPoint.lat, selectedPoint.lon, undefined, true);
                        }}
                        className="w-full py-2.5 bg-saddle-brown text-parchment text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-leather transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                      >
                        <Sparkles size={12} className="text-antique-gold" />
                        Deep AI Analysis
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          )}


          {/* Geographical Overlays (Moved outside MapContainer context to avoid hydration/render errors) */}
          <div className="absolute inset-0 z-[400] pointer-events-none overflow-hidden">
            {overlays.rivers && (
              <div className="absolute inset-0 opacity-60 mix-blend-multiply">
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
                </svg>
              </div>
            )}

            {overlays.plains && (
              <div className="absolute inset-0 opacity-20">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  className="absolute top-[25%] left-[35%] w-[40%] h-[15%] bg-green-500 rounded-full blur-[60px]"
                />
              </div>
            )}

            {overlays.plateaus && (
              <div className="absolute inset-0 opacity-20">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  className="absolute top-[50%] left-[35%] w-[30%] h-[30%] bg-amber-800 rounded-full blur-[80px]"
                />
              </div>
            )}
          </div>

          
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

        <motion.div 
          className="lg:col-span-1 flex flex-col gap-6"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <AnimatePresence>
            {isSidebarOpen && selectedPoint && (
              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 50, opacity: 0 }}
                className="bg-white p-6 rounded-3xl border-2 border-saddle-brown/20 shadow-2xl scholarship-sidebar"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-serif font-bold text-saddle-brown text-2xl leading-none">{selectedPoint.name}</h3>
                    <p className="text-[10px] font-bold text-antique-gold uppercase tracking-[0.2em] mt-1">Location Dossier</p>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-saddle-brown/5 rounded-full">
                    <ArrowLeft className="text-saddle-brown" size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-parchment/50 border border-saddle-brown/10 rounded-2xl">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-saddle-brown/60 mb-2 flex items-center gap-2">
                       <MapPin size={12} className="text-antique-gold" /> Coordinates
                    </h4>
                    <p className="text-xs font-serif italic">{selectedPoint.coords ? selectedPoint.coords[0].toFixed(4) : selectedPoint.lat.toFixed(4)}, {selectedPoint.coords ? selectedPoint.coords[1].toFixed(4) : selectedPoint.lon.toFixed(4)}</p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-saddle-brown/60 mb-2 flex items-center gap-2">
                       <Navigation size={12} className="text-antique-gold" /> Strategic Importance
                    </h4>
                    <p className="text-sm font-serif leading-relaxed text-leather">
                      {selectedPoint.importance || selectedPoint.upsc || "Analyzing strategic geography through the Lens of UPSC Mains GS-I & GS-III."}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-saddle-brown/60 mb-2 flex items-center gap-2">
                       <Compass size={12} className="text-antique-gold" /> Concise History
                    </h4>
                    <p className="text-xs font-serif leading-relaxed text-leather/80 italic">
                      {selectedPoint.history || selectedPoint.info || "History is often shaped by mountains and rivers. This region stands at a crossroad of civilization."}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-saddle-brown/10 flex flex-col gap-3">
                    <Button 
                      onClick={() => analyzeStrategicSignificance(selectedPoint.lat || selectedPoint.coords[0], selectedPoint.lon || selectedPoint.coords[1], selectedPoint.name, true)}
                      disabled={isAnalyzing}
                      className="w-full bg-saddle-brown hover:bg-leather text-parchment rounded-xl py-6 flex items-center gap-3 relative overflow-hidden group"
                    >
                      <Sparkles size={20} className={isAnalyzing ? "animate-spin text-antique-gold" : "text-antique-gold group-hover:scale-125 transition-transform"} />
                      <span className="font-bold tracking-widest text-[10px] uppercase">Consult Oracle AI</span>
                      {isAnalyzing && (
                         <motion.div 
                          className="absolute inset-0 bg-antique-gold/10"
                          animate={{ x: ['100%', '-100%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                         />
                      )}
                    </Button>

                    <Button 
                      variant="outline"
                      onClick={handleSaveToVault}
                      disabled={isSaving || saveStatus === 'success'}
                      className={`w-full rounded-xl py-6 flex items-center gap-3 transition-all ${
                        saveStatus === 'success' 
                          ? 'bg-green-50 border-green-500/30 text-green-700' 
                          : saveStatus === 'error'
                          ? 'bg-red-50 border-red-500/30 text-red-700'
                          : 'border-saddle-brown/20 text-saddle-brown hover:bg-parchment'
                      }`}
                    >
                      {saveStatus === 'saving' ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span className="font-bold tracking-widest text-[10px] uppercase text-leather/60">Sealing Archive...</span>
                        </>
                      ) : saveStatus === 'success' ? (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2 w-full">
                           <Save size={18} className="text-green-600" />
                           <span className="font-bold tracking-widest text-[10px] uppercase">Marker Archived Successfully</span>
                        </motion.div>
                      ) : saveStatus === 'error' ? (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2 w-full">
                          <X size={18} className="text-red-600" />
                          <span className="font-bold tracking-widest text-[10px] uppercase">Archival Failure</span>
                        </motion.div>
                      ) : (
                        <>
                          <Save size={18} />
                          <span className="font-bold tracking-widest text-[10px] uppercase">Archive to Vault</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white p-6 rounded-3xl border border-saddle-brown/10 shadow-sm grow min-h-0 flex flex-col overflow-hidden">
            <h3 className="font-serif font-bold text-saddle-brown mb-4 flex items-center gap-2 shrink-0">
              <Navigation size={18} className="text-antique-gold" />
              Strategic Points
            </h3>
            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1">
              {locations.map((point: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCenter(point.coords as [number, number]);
                    setSelectedPoint(point);
                    setIsSidebarOpen(true);
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all border ${
                    selectedPoint?.name === point.name 
                      ? 'bg-saddle-brown text-parchment border-saddle-brown shadow-md' 
                      : 'bg-parchment/10 text-leather border-saddle-brown/5 hover:bg-parchment/50'
                  }`}
                >
                  <p className="font-serif font-bold text-sm">{point.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] uppercase tracking-widest opacity-60">Reconnaissance Active</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {analysis && (
        <div className="bg-[#1A1612] text-[#F5F2E7] p-6 rounded-3xl shadow-xl border-2 border-[#D4AF37]/30">
          <h3 className="font-serif font-bold mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#D4AF37]" />
              Strategic Insight
            </div>
            {isAnalyzing && <Loader2 size={14} className="animate-spin text-[#D4AF37]" />}
          </h3>
          <div className="text-[11px] font-serif leading-relaxed prose prose-invert prose-p:my-1 prose-headings:text-[#D4AF37] prose-headings:text-sm prose-headings:mt-3 prose-headings:mb-1 custom-scrollbar max-h-[400px] overflow-y-auto pr-2">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        </div>
      )}

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
