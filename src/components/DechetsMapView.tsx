import React, { useState, useMemo, useEffect, useRef } from 'react';

declare global {
  interface Window {
    L: any;
  }
}
import { 
  PoubelleSignal, 
  Eboueur, 
  Commune, 
  Avenue, 
  Parcelle, 
  Abonne 
} from '../types';
import { 
  Trash2, 
  MapPin, 
  Truck, 
  UserCheck, 
  Bell, 
  Send, 
  CheckCircle2, 
  Clock, 
  Navigation, 
  Map as MapIcon, 
  Radio, 
  AlertTriangle,
  Play,
  Layers,
  X
} from 'lucide-react';

interface DechetsMapViewProps {
  signals: PoubelleSignal[];
  eboueurs: Eboueur[];
  communes: Commune[];
  avenues: Avenue[];
  parcelles: Parcelle[];
  abonnes: Abonne[];
  onAssignMission: (signalId: string, eboueurId: string) => void;
  onSimulateSignal: (parcelleId: string, typePoubelle?: 'biodegradable' | 'non_biodegradable') => void;
  initialSelectedSignalId?: string | null;
  onSelectSignalId?: (id: string | null) => void;
}

export default function DechetsMapView({
  signals,
  eboueurs,
  communes,
  avenues,
  parcelles,
  abonnes,
  onAssignMission,
  onSimulateSignal,
  initialSelectedSignalId,
  onSelectSignalId
}: DechetsMapViewProps) {
  const [selectedSignalId, setSelectedSignalIdState] = useState<string | null>(initialSelectedSignalId || null);
  const [selectedEboueurId, setSelectedEboueurId] = useState<string | null>(null);
  const [showAllParcelles, setShowAllParcelles] = useState<boolean>(true);

  // Synchronize state with incoming initialSelectedSignalId prop
  useEffect(() => {
    if (initialSelectedSignalId !== undefined) {
      setSelectedSignalIdState(initialSelectedSignalId);
      if (initialSelectedSignalId) {
        setSelectedEboueurId(null);
      }
    }
  }, [initialSelectedSignalId]);

  const setSelectedSignalId = (id: string | null) => {
    setSelectedSignalIdState(id);
    if (onSelectSignalId) {
      onSelectSignalId(id);
    }
  };
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'assigned' | 'completed'>('all');
  const [simulationCommuneId, setSimulationCommuneId] = useState<string>('');
  const [simulationAvenueId, setSimulationAvenueId] = useState<string>('');
  const [simulationParcelleId, setSimulationParcelleId] = useState<string>('');

  // Localisation Modal States
  const [isLocalisationModalOpen, setIsLocalisationModalOpen] = useState(false);
  const [locCommuneId, setLocCommuneId] = useState('');
  const [locAvenueId, setLocAvenueId] = useState('');
  const [locParcelleId, setLocParcelleId] = useState('');
  const [locSachetType, setLocSachetType] = useState<'biodegradable' | 'non_biodegradable'>('biodegradable');

  // Communes list for simulation dropdown
  const simulationAvenues = useMemo(() => {
    if (!simulationCommuneId) return [];
    return avenues.filter(a => a.commune_id === simulationCommuneId);
  }, [avenues, simulationCommuneId]);

  const simulationParcelles = useMemo(() => {
    if (!simulationAvenueId) return [];
    return parcelles.filter(p => p.avenue_id === simulationAvenueId);
  }, [parcelles, simulationAvenueId]);

  // Localisation list memoization
  const locAvenues = useMemo(() => {
    if (!locCommuneId) return [];
    return avenues.filter(a => a.commune_id === locCommuneId);
  }, [avenues, locCommuneId]);

  const locParcelles = useMemo(() => {
    if (!locAvenueId) return [];
    return parcelles.filter(p => p.avenue_id === locAvenueId);
  }, [parcelles, locAvenueId]);

  const selectedLocParcelle = useMemo(() => {
    return parcelles.find(p => p.id === locParcelleId);
  }, [parcelles, locParcelleId]);

  const selectedLocAbonne = useMemo(() => {
    if (!locParcelleId) return null;
    return abonnes.find(a => a.parcelle_id === locParcelleId);
  }, [abonnes, locParcelleId]);

  // Filter signals based on active tab
  const filteredSignals = useMemo(() => {
    if (activeTab === 'all') return signals;
    return signals.filter(s => s.status === activeTab);
  }, [signals, activeTab]);

  // Selected signal details
  const selectedSignal = useMemo(() => {
    return signals.find(s => s.id === selectedSignalId);
  }, [signals, selectedSignalId]);

  // Find parcels with GPS to plot on map
  const parcelGpsPoints = useMemo(() => {
    return parcelles.filter(p => p.latitude != null && p.longitude != null);
  }, [parcelles]);

  // Get coordinates for signals
  const getSignalCoords = (signal: PoubelleSignal) => {
    const p = parcelles.find(pa => pa.id === signal.parcelle_id);
    if (p && p.latitude && p.longitude) {
      return { lat: p.latitude, lng: p.longitude };
    }
    // Fallback coordinates based on hash for demo
    const hash = signal.id.charCodeAt(0) + signal.id.charCodeAt(1);
    return {
      lat: -4.33 + (hash % 100) * 0.001,
      lng: 15.31 + (hash % 80) * 0.001
    };
  };

  // Helper to calculate Euclidean distance (simulated km for simple UI display)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const d = Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
    // scale factor to make it look like real-world kilometers in Kinshasa
    return parseFloat((d * 111.12).toFixed(2));
  };

  // Find nearest collector for selected signal
  const nearestCollectors = useMemo(() => {
    if (!selectedSignal) return [];
    const signalCoords = getSignalCoords(selectedSignal);
    
    return eboueurs
      .filter(eb => eb.gps_active && eb.latitude != null && eb.longitude != null && !isNaN(eb.latitude) && !isNaN(eb.longitude))
      .map(eb => {
        const dist = calculateDistance(signalCoords.lat, signalCoords.lng, eb.latitude, eb.longitude);
        return {
          ...eb,
          distance: dist
        };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [selectedSignal, eboueurs]);

  // Map Leaflet implementation refs & states
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize Map
  useEffect(() => {
    let intervalId: any;
    
    const initMap = () => {
      if (!window.L) return false;
      if (!mapContainerRef.current) return false;
      if (mapRef.current) return true;

      try {
        const map = window.L.map(mapContainerRef.current, {
          center: [-4.3316, 15.3139],
          zoom: 12,
          zoomControl: true,
        });
        
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        mapRef.current = map;
        setIsMapReady(true);
        return true;
      } catch (err) {
        console.error("Leaflet init error:", err);
        return false;
      }
    };

    if (!initMap()) {
      intervalId = setInterval(() => {
        if (initMap()) {
          clearInterval(intervalId);
        }
      }, 500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // Update Markers dynamically when data, active states, or map is ready
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.L) return;

    const map = mapRef.current;

    if (!markerGroupRef.current) {
      markerGroupRef.current = window.L.layerGroup().addTo(map);
    } else {
      markerGroupRef.current.clearLayers();
    }

    const markerGroup = markerGroupRef.current;

    // Plot Signals
    signals.forEach((sig) => {
      const coords = getSignalCoords(sig);
      const isSelected = selectedSignalId === sig.id;
      const isPending = sig.status === 'pending';
      const isAssigned = sig.status === 'assigned';

      let markerColor = 'bg-error';
      let iconHtml = '🚨';
      let pingHtml = '';
      if (isPending) {
        pingHtml = `
          <span class="absolute inline-flex h-12 w-12 rounded-full bg-red-500/30 animate-ping" style="animation-duration: 1.5s;"></span>
          <span class="absolute inline-flex h-7 w-7 rounded-full bg-red-500/50 animate-ping" style="animation-duration: 1s;"></span>
        `;
      }

      if (isPending) {
        markerColor = 'bg-red-600';
        iconHtml = '🚨';
      } else if (isAssigned) {
        markerColor = 'bg-yellow-500';
        iconHtml = '⏳';
      } else {
        markerColor = 'bg-emerald-600';
        iconHtml = '✅';
      }

      const customIcon = window.L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center transition-all duration-300" style="transform: ${isSelected ? 'scale(1.25)' : 'scale(1.0)'}; z-index: ${isSelected ? '9999' : '100'};">
            ${pingHtml}
            <div class="p-2 rounded-full ${markerColor} text-white border-2 ${isSelected ? 'border-yellow-400 scale-110' : 'border-white'} shadow-md flex items-center justify-center font-bold" style="width: 32px; height: 32px; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
              ${iconHtml}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = window.L.marker([coords.lat, coords.lng], { icon: customIcon });
      
      marker.bindPopup(`
        <div class="text-xs p-1 leading-normal" style="color: #0b1c30; font-family: sans-serif;">
          <strong class="text-primary block font-bold text-sm mb-1">Parcelle N° ${sig.numero_parcelle}</strong>
          <strong>Avenue:</strong> ${sig.avenue_nom}<br/>
          <strong>Commune:</strong> ${sig.commune_nom}<br/>
          <strong>Bailleur:</strong> ${sig.bailleur_nom}<br/>
          <strong>Signalé à:</strong> ${sig.reported_at.substring(11, 16)}<br/>
          <div class="mt-1.5 font-bold text-[10px] uppercase inline-block px-1.5 py-0.5 rounded ${isPending ? 'bg-red-100 text-red-700' : isAssigned ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}">
            ${sig.status === 'pending' ? 'Poubelle Pleine 🚨' : sig.status === 'assigned' ? 'Assigné 🚚' : 'Vidé ✔'}
          </div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedSignalId(sig.id);
        setSelectedEboueurId(null);
      });

      marker.addTo(markerGroup);
    });

    // Plot Eboueurs (collectors)
    eboueurs.filter(eb => eb.gps_active && eb.latitude != null && eb.longitude != null && !isNaN(eb.latitude) && !isNaN(eb.longitude)).forEach((eb) => {
      const isSelected = selectedEboueurId === eb.id;
      const isBusy = eb.status === 'en_mission';

      const customIcon = window.L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center transition-all duration-300" style="transform: ${isSelected ? 'scale(1.25)' : 'scale(1.0)'}; z-index: ${isSelected ? '9999' : '100'};">
            <span class="absolute inline-flex h-7 w-7 rounded-full bg-blue-500/20 animate-pulse"></span>
            <div class="p-2 rounded-full bg-blue-600 text-white border-2 ${isSelected ? 'border-yellow-400 scale-110' : 'border-white'} shadow-md flex items-center justify-center" style="width: 32px; height: 32px; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
              🚚
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = window.L.marker([eb.latitude, eb.longitude], { icon: customIcon });

      marker.bindPopup(`
        <div class="text-xs p-1 leading-normal" style="color: #0b1c30; font-family: sans-serif;">
          <strong class="text-secondary block font-bold text-sm mb-1">${eb.nom}</strong>
          <strong>Téléphone:</strong> ${eb.telephone}<br/>
          <strong>Statut:</strong> ${isBusy ? 'En mission active 🚚' : 'Disponible 🔋'}<br/>
          <strong>Position:</strong> ${eb.latitude.toFixed(5)}, ${eb.longitude.toFixed(5)}
        </div>
      `);

      marker.on('click', () => {
        setSelectedEboueurId(eb.id);
        setSelectedSignalId(null);
      });

      marker.addTo(markerGroup);
    });

    // Plot All Surveyed Parcelles (GPS Validés) if enabled
    if (showAllParcelles) {
      parcelGpsPoints.forEach((p) => {
        // Skip if this parcelle already has an active trash alert to avoid double-marking
        const hasActiveSignal = signals.some(s => s.parcelle_id === p.id && s.status !== 'completed');
        if (hasActiveSignal) return;

        const bailleur = abonnes.find(ab => ab.parcelle_id === p.id);
        const avenueObj = avenues.find(a => a.id === p.avenue_id);
        const communeObj = avenueObj ? communes.find(c => c.id === avenueObj.commune_id) : null;

        const customIcon = window.L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div class="relative flex items-center justify-center transition-all duration-300" style="z-index: 50;">
              <div class="p-1 rounded-full bg-emerald-500 text-white border border-white shadow-sm flex items-center justify-center font-bold" style="width: 22px; height: 22px; font-size: 11px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                🏡
              </div>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = window.L.marker([p.latitude, p.longitude], { icon: customIcon });

        marker.bindPopup(`
          <div class="text-xs p-1 leading-normal" style="color: #0b1c30; font-family: sans-serif; min-width: 170px;">
            <strong class="text-emerald-600 block font-bold text-[13px] mb-1">🏡 GPS Validé (N° ${p.numero_parcelle})</strong>
            <strong style="color: #4b5563;">Avenue:</strong> ${avenueObj?.nom || 'Inconnue'}<br/>
            <strong style="color: #4b5563;">Commune:</strong> ${communeObj?.nom || 'Inconnue'}<br/>
            <strong style="color: #4b5563;">Bailleur:</strong> ${bailleur?.nom_complet || 'Responsable non saisi'}<br/>
            <strong style="color: #4b5563;">Téléphone:</strong> ${bailleur?.telephone_principal || 'N/A'}<br/>
            <strong style="color: #4b5563;">Type Logement:</strong> ${p.type_logement === 'maison_basse' ? 'Maison basse' : 'Appartement'}<br/>
            <strong style="color: #4b5563;">Ménages:</strong> ${p.nombre_menages}<br/>
            <div class="mt-1.5 font-bold text-[9px] uppercase inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Recensement Validé ✔
            </div>
          </div>
        `);

        marker.addTo(markerGroup);
      });
    }

  }, [isMapReady, signals, eboueurs, selectedSignalId, selectedEboueurId, showAllParcelles, parcelGpsPoints, abonnes, avenues, communes]);

  // Center & fly map to selected items
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.L) return;

    if (selectedSignalId) {
      const sig = signals.find(s => s.id === selectedSignalId);
      if (sig) {
        const coords = getSignalCoords(sig);
        mapRef.current.flyTo([coords.lat, coords.lng], 15, {
          animate: true,
          duration: 1.2
        });
      }
    } else if (selectedEboueurId) {
      const eb = eboueurs.find(e => e.id === selectedEboueurId);
      if (eb && eb.gps_active && eb.latitude != null && eb.longitude != null && !isNaN(eb.latitude) && !isNaN(eb.longitude)) {
        mapRef.current.flyTo([eb.latitude, eb.longitude], 15, {
          animate: true,
          duration: 1.2
        });
      }
    }
  }, [selectedSignalId, selectedEboueurId, isMapReady]);

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulationParcelleId) return;
    onSimulateSignal(simulationParcelleId);
    setSimulationParcelleId('');
    alert("Signal de poubelle pleine envoyé avec succès pour cette parcelle !");
  };

  const handleLocalisationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locParcelleId) return;

    // Trigger simulation with sachet type
    onSimulateSignal(locParcelleId, locSachetType);

    // Pan map to the location
    const p = parcelles.find(pa => pa.id === locParcelleId);
    if (p && p.latitude != null && p.longitude != null && mapRef.current) {
      mapRef.current.flyTo([p.latitude, p.longitude], 16, {
        animate: true,
        duration: 1.5
      });
    }

    // Reset and Close
    setLocCommuneId('');
    setLocAvenueId('');
    setLocParcelleId('');
    setLocSachetType('biodegradable');
    setIsLocalisationModalOpen(false);
    
    alert("📍 Signalement de poubelle pleine localisé avec succès ! La carte a été centrée sur l'emplacement.");
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-on-background">
      {/* Header block */}
      <div className="flex flex-col gap-1.5 border-b border-outline-variant/40 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-error/15 rounded-xl text-error">
            <Trash2 size={24} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-on-background font-sans">
              Gestion de la Salubrité & Éboueurs
            </h2>
            <p className="text-sm text-on-surface-variant font-medium">
              Suivi en temps réel des alertes de poubelles pleines et géolocalisation des agents collecteurs.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Map on Left, Sidebar on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Interactive Simulated Map */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          <div className="bg-surface rounded-3xl border border-outline-variant overflow-hidden shadow-lg flex flex-col h-[500px]">
            {/* Map Controls Header */}
            <div className="bg-background/80 px-4 py-3 border-b border-outline-variant flex justify-between items-center z-10 backdrop-blur-sm">
              <span className="text-xs font-extrabold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                <Layers size={14} className="text-secondary" />
                Carte interactive de Kinshasa
              </span>
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => setShowAllParcelles(!showAllParcelles)}
                  className={`border font-bold text-[11px] px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer ${
                    showAllParcelles 
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-[#10b981] border-emerald-500/20' 
                      : 'bg-surface hover:bg-surface/80 text-on-surface-variant border-outline-variant'
                  }`}
                >
                  <span>🏡</span>
                  <span>{showAllParcelles ? 'Masquer Parcelles' : 'Afficher Parcelles'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLocalisationModalOpen(true)}
                  className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-bold text-[11px] px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                >
                  <MapPin size={13} />
                  <span>Localisation</span>
                </button>
                <div className="flex gap-2 items-center text-[10px] text-on-surface-variant font-bold">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-error rounded-full animate-ping"></span>
                    <span>Alertes ({signals.filter(s => s.status === 'pending').length})</span>
                  </span>
                  <span className="flex items-center gap-1 ml-2">
                    <span className="w-2.5 h-2.5 bg-[#10b981] rounded-full"></span>
                    <span>Éboueurs Actifs ({eboueurs.filter(e => e.gps_active).length})</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Real OpenStreetMap Leaflet Map */}
            <div className="flex-grow relative w-full h-full bg-[#111] overflow-hidden" style={{ minHeight: '400px' }}>
              <div 
                ref={mapContainerRef} 
                className="absolute inset-0 w-full h-full"
                style={{ zIndex: 1 }}
              />

              {/* Compass Calibration Helper Graphic overlay */}
              <div className="absolute bottom-4 right-4 bg-background/90 border border-outline-variant p-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-mono font-bold text-on-surface-variant backdrop-blur-sm shadow-md z-[500]">
                <Navigation size={14} className="text-secondary rotate-45 shrink-0" />
                <span>Région Kinshasa (Données réelles OSM)</span>
              </div>

              {/* Localisation Panel overlaying the map directly */}
              {isLocalisationModalOpen && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur-md flex flex-col z-[1001] p-4 overflow-y-auto animate-fade-in">
                  
                  {/* Modal Header */}
                  <div className="pb-2 border-b border-outline-variant/60 flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-primary animate-bounce" />
                      <h3 className="text-xs font-extrabold tracking-wider text-on-surface font-sans uppercase">
                        Localiser une Poubelle Pleine
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLocalisationModalOpen(false)}
                      className="p-1 hover:bg-surface-variant rounded-xl text-on-surface-variant transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Modal Content / Form */}
                  <form onSubmit={handleLocalisationSubmit} className="flex-grow flex flex-col gap-3">
                    
                    {/* Two Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      {/* Left Column: Input Selectors */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant">
                            Commune *
                          </label>
                          <select
                            required
                            value={locCommuneId}
                            onChange={(e) => {
                              setLocCommuneId(e.target.value);
                              setLocAvenueId('');
                              setLocParcelleId('');
                            }}
                            className="w-full h-8.5 px-3 bg-background border border-outline-variant rounded-xl text-xs font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            <option value="">-- Choisir une commune --</option>
                            {communes.map((c) => (
                              <option key={c.id} value={c.id}>{c.nom}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant">
                            Avenue *
                          </label>
                          <select
                            required
                            disabled={!locCommuneId}
                            value={locAvenueId}
                            onChange={(e) => {
                              setLocAvenueId(e.target.value);
                              setLocParcelleId('');
                            }}
                            className="w-full h-8.5 px-3 bg-background border border-outline-variant disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            <option value="">-- Choisir une avenue --</option>
                            {locAvenues.map((a) => (
                              <option key={a.id} value={a.id}>{a.nom}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant">
                            Numéro de Parcelle *
                          </label>
                          <select
                            required
                            disabled={!locAvenueId}
                            value={locParcelleId}
                            onChange={(e) => setLocParcelleId(e.target.value)}
                            className="w-full h-8.5 px-3 bg-background border border-outline-variant disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            <option value="">-- Choisir une parcelle --</option>
                            {locParcelles.map((p) => (
                              <option key={p.id} value={p.id}>N° {p.numero_parcelle}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant">
                            ID / Téléphone du Bailleur
                          </label>
                          <input
                            type="text"
                            readOnly
                            placeholder="Sélectionnez une parcelle"
                            value={selectedLocAbonne?.telephone_principal || (locParcelleId ? 'Aucun numéro enregistré' : '')}
                            className="w-full h-8.5 px-3 bg-background/50 border border-outline-variant/60 rounded-xl text-xs font-semibold text-on-surface-variant outline-none cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* Right Column: Dynamic Info Card & Sachet Selection */}
                      <div className="flex flex-col gap-2.5 justify-between">
                        
                        {/* Dynamic Info Card */}
                        {locParcelleId ? (
                          <div className="bg-surface-variant/30 border border-outline-variant/60 rounded-xl p-2.5 flex flex-col gap-1.5 animate-fade-in flex-grow justify-center">
                            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-1">
                              <span className="text-[8px] font-black uppercase tracking-wider text-on-surface-variant">Bailleur & GPS</span>
                              <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Abonné</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                              <div>
                                <p className="text-[7px] font-bold text-on-surface-variant uppercase tracking-wider">Nom</p>
                                <p className="font-extrabold text-on-surface text-xs leading-none truncate" title={selectedLocAbonne?.nom_complet}>{selectedLocAbonne?.nom_complet || 'Inconnu'}</p>
                              </div>
                              <div>
                                <p className="text-[7px] font-bold text-on-surface-variant uppercase tracking-wider">ID</p>
                                <p className="font-mono text-on-surface font-bold text-[9px] truncate" title={selectedLocAbonne?.id}>{selectedLocAbonne?.id || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[7px] font-bold text-on-surface-variant uppercase tracking-wider">Latitude</p>
                                <p className="font-mono font-bold text-primary text-[10px]">{selectedLocParcelle?.latitude || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[7px] font-bold text-on-surface-variant uppercase tracking-wider">Longitude</p>
                                <p className="font-mono font-bold text-primary text-[10px]">{selectedLocParcelle?.longitude || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-surface-variant/10 border border-dashed border-outline-variant rounded-xl p-3 flex flex-col items-center justify-center text-center flex-grow text-on-surface-variant">
                            <MapPin size={20} className="opacity-30 mb-1 text-primary" />
                            <p className="text-[10px] font-medium leading-normal max-w-[180px]">
                              Sélectionnez les détails à gauche pour charger les coordonnées GPS.
                            </p>
                          </div>
                        )}

                        {/* Sachet Selection */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant">
                            Type de déchet (Sachet) *
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setLocSachetType('biodegradable')}
                              className={`h-8 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                locSachetType === 'biodegradable'
                                  ? 'bg-emerald-600/15 border-emerald-500 text-emerald-500 shadow-sm font-black'
                                  : 'bg-background border-outline-variant text-on-surface-variant hover:bg-background/85'
                              }`}
                            >
                              <CheckCircle2 size={11} />
                              <span>Dégradable</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setLocSachetType('non_biodegradable')}
                              className={`h-8 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                locSachetType === 'non_biodegradable'
                                  ? 'bg-red-600/15 border-red-500 text-red-500 shadow-sm font-black'
                                  : 'bg-background border-outline-variant text-on-surface-variant hover:bg-background/85'
                              }`}
                            >
                              <AlertTriangle size={11} />
                              <span>Non dégradable</span>
                            </button>
                          </div>
                        </div>

                      </div>

                    </div>

                    {/* Bottom Centered / Adjusted Validation Button */}
                    <div className="border-t border-outline-variant/60 pt-2 flex justify-center mt-auto">
                      <button
                        type="submit"
                        disabled={!locParcelleId}
                        className="w-full max-w-sm h-9 bg-primary text-on-primary disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-outline-variant"
                      >
                        <MapPin size={12} className="animate-pulse" />
                        <span>Confirmer & Afficher sur la carte 🚀</span>
                      </button>
                    </div>

                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Quick Simulation Trigger for testing */}
          <div className="bg-surface rounded-2xl border border-outline-variant p-4 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
              <Radio size={14} className="text-error animate-pulse" />
              Simuler l'alerte d'un Abonné (Test Express)
            </h4>
            <form onSubmit={handleSimulate} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase">Commune</span>
                <select
                  value={simulationCommuneId}
                  onChange={(e) => {
                    setSimulationCommuneId(e.target.value);
                    setSimulationAvenueId('');
                    setSimulationParcelleId('');
                  }}
                  className="bg-background border border-outline-variant text-xs h-9 rounded-xl pl-2 text-on-surface cursor-pointer"
                  required
                >
                  <option value="">Sélectionner</option>
                  {communes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase">Avenue</span>
                <select
                  value={simulationAvenueId}
                  onChange={(e) => {
                    setSimulationAvenueId(e.target.value);
                    setSimulationParcelleId('');
                  }}
                  className="bg-background border border-outline-variant text-xs h-9 rounded-xl pl-2 text-on-surface cursor-pointer"
                  disabled={!simulationCommuneId}
                  required
                >
                  <option value="">Sélectionner</option>
                  {simulationAvenues.map(a => <option key={a.id} value={a.id}>Av. {a.nom}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase">Parcelle & Bailleur</span>
                <select
                  value={simulationParcelleId}
                  onChange={(e) => setSimulationParcelleId(e.target.value)}
                  className="bg-background border border-outline-variant text-xs h-9 rounded-xl pl-2 text-on-surface cursor-pointer"
                  disabled={!simulationAvenueId}
                  required
                >
                  <option value="">Sélectionner</option>
                  {simulationParcelles.map(p => {
                    const o = abonnes.find(ab => ab.parcelle_id === p.id);
                    return (
                      <option key={p.id} value={p.id}>
                        N° {p.numero_parcelle} - {o ? o.nom_complet : 'Bailleur inconnu'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="submit"
                disabled={!simulationParcelleId}
                className="bg-error text-white text-xs font-bold h-9 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play size={12} />
                <span>Déclencher l'alerte</span>
              </button>
            </form>
          </div>

        </div>

        {/* Column 3: Sidebar Mission Center */}
        <div className="flex flex-col gap-4">
          
          {/* Section A: Selection detail & assignment action */}
          <div className="bg-surface border border-outline-variant rounded-2xl p-4 shadow-md">
            {selectedSignal ? (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="flex justify-between items-start gap-2 border-b border-outline-variant/40 pb-3">
                  <div>
                    <span className="text-[9px] px-2 py-0.5 bg-error/15 text-error font-extrabold uppercase rounded-full border border-error/20">
                      Alerte active 🚨
                    </span>
                    <h3 className="text-base font-extrabold text-on-surface mt-1.5">
                      Parcelle N° {selectedSignal.numero_parcelle}
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Avenue {selectedSignal.avenue_nom}, {selectedSignal.commune_nom}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedSignalId(null)}
                    className="text-on-surface-variant hover:text-on-surface p-1 rounded"
                  >
                    Close ✕
                  </button>
                </div>

                {/* Bailleur info block */}
                <div className="bg-background/50 border border-outline-variant/60 p-3 rounded-xl flex flex-col gap-1 text-xs">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Bailleur Signalant
                  </span>
                  <span className="font-extrabold text-on-surface">{selectedSignal.bailleur_nom}</span>
                  <span className="font-mono text-on-surface-variant">{selectedSignal.bailleur_telephone}</span>
                  <span className="text-[10px] text-on-surface-variant mt-1.5 flex items-center gap-1 italic">
                    <Clock size={11} /> Signalé à {selectedSignal.reported_at.substring(11, 16)} le {selectedSignal.reported_at.substring(0, 10)}
                  </span>
                </div>

                {/* Dispatch & Closest Collector Section */}
                {selectedSignal.status === 'pending' ? (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                      <Truck size={14} />
                      Éboueurs géolocalisés à proximité
                    </h4>

                    {nearestCollectors.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic p-2 bg-background/50 rounded-lg text-center">
                        Aucun éboueur n'a activé son GPS actuellement. Demandez aux agents d'activer leur traceur GPS.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                        {nearestCollectors.map((eb) => (
                          <div 
                            key={eb.id}
                            className={`p-2.5 border rounded-xl flex justify-between items-center bg-background/40 hover:bg-background/80 transition-colors cursor-pointer ${
                              eb.status === 'en_mission' ? 'opacity-65 border-outline-variant/40' : 'border-outline-variant'
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-on-surface flex items-center gap-1">
                                {eb.nom}
                                {eb.status === 'en_mission' && (
                                  <span className="text-[8px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1 rounded">
                                    En mission
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-on-surface-variant">
                                Distance : <strong className="text-secondary">{eb.distance} km</strong>
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                onAssignMission(selectedSignal.id, eb.id);
                                setSelectedSignalId(null);
                                alert(`Mission envoyée à l'éboueur ${eb.nom} ! Un SMS/Notification lui a été transmis.`);
                              }}
                              className="px-2.5 py-1.5 bg-[#10b981] hover:bg-[#10b981]/90 text-white font-extrabold text-[10px] rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <Send size={10} />
                              <span>Assigner</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/25 rounded-xl text-xs text-[#10b981] flex flex-col gap-1">
                    <span className="font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Mission assignée / traitée
                    </span>
                    {selectedSignal.status === 'assigned' && (
                      <p className="text-on-surface-variant">
                        L'éboueur est actuellement en route pour vider la poubelle de cette adresse.
                      </p>
                    )}
                    {selectedSignal.status === 'completed' && (
                      <p className="text-on-surface-variant">
                        Mission accomplie le {selectedSignal.completed_at?.substring(11, 16)} avec succès.
                      </p>
                    )}
                  </div>
                )}

              </div>
            ) : selectedEboueurId ? (() => {
              const eb = eboueurs.find(e => e.id === selectedEboueurId);
              if (!eb) return null;
              const activeMission = signals.find(s => s.assigned_eboueur_id === eb.id && s.status === 'assigned');
              return (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex justify-between items-start gap-2 border-b border-outline-variant/40 pb-3">
                    <div>
                      <span className="text-[9px] px-2 py-0.5 bg-secondary/15 text-secondary font-extrabold uppercase rounded-full border border-secondary/20">
                        Profil Éboueur 🚚
                      </span>
                      <h3 className="text-base font-extrabold text-on-surface mt-1.5">{eb.nom}</h3>
                      <p className="text-xs text-on-surface-variant">{eb.telephone}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedEboueurId(null)}
                      className="text-on-surface-variant hover:text-on-surface p-1 rounded"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Statut GPS :</span>
                      <span className={`font-bold ${eb.gps_active ? 'text-[#10b981]' : 'text-error'}`}>
                        {eb.gps_active ? '● Actif / En ligne' : '○ Inactif'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Coordonnées :</span>
                      <span className="font-mono text-on-surface-variant">{eb.latitude.toFixed(5)}, {eb.longitude.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between border-t border-outline-variant/30 pt-2">
                      <span className="text-on-surface-variant">Statut de mission :</span>
                      <span className={`font-bold ${eb.status === 'en_mission' ? 'text-yellow-500' : 'text-[#10b981]'}`}>
                        {eb.status === 'en_mission' ? 'En mission active' : 'Libre / En attente'}
                      </span>
                    </div>
                  </div>

                  {activeMission && (
                    <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl flex flex-col gap-1.5 text-xs text-on-surface">
                      <span className="font-bold text-yellow-500 flex items-center gap-1">
                        <AlertTriangle size={13} /> Mission assignée en cours :
                      </span>
                      <p className="font-medium text-xs leading-relaxed">
                        Vider la poubelle de <strong>{activeMission.bailleur_nom}</strong> au <strong>N° {activeMission.numero_parcelle}, Av. {activeMission.avenue_nom} ({activeMission.commune_nom})</strong>
                      </p>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="text-center py-10 text-on-surface-variant text-xs italic">
                Cliquez sur un signal (poubelle pleine) ou sur un camion d'éboueur sur la carte pour gérer les opérations.
              </div>
            )}
          </div>

          {/* Section B: Signal Logs / Mission Feed */}
          <div className="bg-surface border border-outline-variant rounded-2xl flex flex-col h-[280px]">
            {/* Header / Tabs */}
            <div className="p-3 border-b border-outline-variant/50 flex flex-col gap-2 shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                <Bell size={12} className="text-error" /> Journal des alertes
              </span>
              <div className="flex bg-background border border-outline-variant p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1 rounded transition-all cursor-pointer ${activeTab === 'all' ? 'bg-secondary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Tous ({signals.length})
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`flex-1 py-1 rounded transition-all cursor-pointer ${activeTab === 'pending' ? 'bg-secondary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Pleines ({signals.filter(s => s.status === 'pending').length})
                </button>
                <button
                  onClick={() => setActiveTab('assigned')}
                  className={`flex-1 py-1 rounded transition-all cursor-pointer ${activeTab === 'assigned' ? 'bg-secondary text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  En cours
                </button>
              </div>
            </div>

            {/* List area */}
            <div className="flex-grow overflow-y-auto p-2 flex flex-col gap-1.5">
              {filteredSignals.length === 0 ? (
                <div className="text-center py-12 text-xs text-on-surface-variant italic">
                  Aucun signalement trouvé.
                </div>
              ) : (
                filteredSignals.map((sig) => {
                  const isPending = sig.status === 'pending';
                  const isAssigned = sig.status === 'assigned';
                  return (
                    <button
                      key={sig.id}
                      onClick={() => {
                        setSelectedSignalId(sig.id);
                        setSelectedEboueurId(null);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        selectedSignalId === sig.id 
                          ? 'bg-secondary/10 border-secondary' 
                          : 'bg-background/35 border-outline-variant/40 hover:bg-background/80'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isPending 
                          ? 'bg-error/15 text-error animate-pulse' 
                          : isAssigned 
                            ? 'bg-yellow-500/15 text-yellow-500' 
                            : 'bg-[#10b981]/15 text-[#10b981]'
                      }`}>
                        <Trash2 size={13} />
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[11px] font-black text-on-surface truncate">
                            N° {sig.numero_parcelle}, Av. {sig.avenue_nom}
                          </span>
                          <span className="text-[8px] font-mono text-on-surface-variant shrink-0 font-bold">
                            {sig.reported_at.substring(11, 16)}
                          </span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant truncate">
                          Bailleur : {sig.bailleur_nom} • {sig.commune_nom}
                        </p>
                        
                        <div className="mt-1 flex items-center justify-between text-[8px] font-extrabold uppercase">
                          <span className={`${isPending ? 'text-error' : isAssigned ? 'text-yellow-500' : 'text-[#10b981]'}`}>
                            {isPending ? 'En attente' : isAssigned ? 'Assigné' : 'Terminé'}
                          </span>
                          {isAssigned && (
                            <span className="text-on-surface-variant font-mono">
                              éboueur : {eboueurs.find(e => e.id === sig.assigned_eboueur_id)?.nom.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
