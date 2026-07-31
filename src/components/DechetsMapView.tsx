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
  getDistanceMeters, 
  calculateCartETA, 
  advancePositionTowardsTarget,
  fetchStreetRoute,
  rankAndFilterCollectorsForSignal
} from '../lib/geoUtils';
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
  X,
  History,
  Search,
  Filter,
  FileText,
  Check,
  ExternalLink
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
  onUpdateEboueurPosition?: (eboueurId: string, latitude: number, longitude: number) => void;
  onEboueurArrived?: (info: {
    signalId: string;
    eboueurNom: string;
    bailleurNom: string;
    numeroParcelle: string;
    avenueNom: string;
    communeNom?: string;
    distanceM: number;
  }) => void;
}

// Kinshasa communes coordinates & strict bounding boxes dictionary for spatial calibration & map locking
interface CommuneGeoConfig {
  lat: number;
  lng: number;
  zoom: number;
  sw: [number, number];
  ne: [number, number];
}

const KINSHASA_COMMUNE_COORDS: Record<string, CommuneGeoConfig> = {
  'bandalungwa': { lat: -4.3400, lng: 15.2850, zoom: 15, sw: [-4.3550, 15.2700], ne: [-4.3250, 15.3000] },
  'barumbu': { lat: -4.3120, lng: 15.3180, zoom: 15, sw: [-4.3250, 15.3050], ne: [-4.2990, 15.3310] },
  'bumbu': { lat: -4.3650, lng: 15.3000, zoom: 15, sw: [-4.3780, 15.2900], ne: [-4.3520, 15.3100] },
  'gombe': { lat: -4.3050, lng: 15.3050, zoom: 15, sw: [-4.3200, 15.2850], ne: [-4.2900, 15.3250] },
  'kalamu': { lat: -4.3450, lng: 15.3150, zoom: 15, sw: [-4.3600, 15.3000], ne: [-4.3300, 15.3300] },
  'kasa-vubu': { lat: -4.3350, lng: 15.3050, zoom: 15, sw: [-4.3480, 15.2950], ne: [-4.3220, 15.3150] },
  'kimbanseke': { lat: -4.4100, lng: 15.4200, zoom: 13, sw: [-4.4600, 15.3800], ne: [-4.3600, 15.4600] },
  'kinshasa': { lat: -4.3250, lng: 15.3180, zoom: 15, sw: [-4.3380, 15.3080], ne: [-4.3120, 15.3280] },
  'kintambo': { lat: -4.3250, lng: 15.2800, zoom: 15, sw: [-4.3380, 15.2680], ne: [-4.3120, 15.2920] },
  'kisenso': { lat: -4.4050, lng: 15.3550, zoom: 14, sw: [-4.4300, 15.3350], ne: [-4.3800, 15.3750] },
  'lemba': { lat: -4.3850, lng: 15.3350, zoom: 14, sw: [-4.4100, 15.3150], ne: [-4.3600, 15.3550] },
  'limete': { lat: -4.3550, lng: 15.3450, zoom: 14, sw: [-4.3850, 15.3150], ne: [-4.3250, 15.3750] },
  'lingwala': { lat: -4.3200, lng: 15.3050, zoom: 15, sw: [-4.3320, 15.2950], ne: [-4.3080, 15.3150] },
  'makala': { lat: -4.3750, lng: 15.3100, zoom: 15, sw: [-4.3900, 15.2980], ne: [-4.3600, 15.3220] },
  'maluku': { lat: -4.2500, lng: 15.6500, zoom: 11, sw: [-4.5000, 15.5000], ne: [-4.0000, 15.8000] },
  'masina': { lat: -4.3700, lng: 15.3800, zoom: 13, sw: [-4.4100, 15.3500], ne: [-4.3300, 15.4200] },
  'matete': { lat: -4.3800, lng: 15.3550, zoom: 15, sw: [-4.3950, 15.3420], ne: [-4.3650, 15.3680] },
  'mont-ngafula': { lat: -4.4300, lng: 15.2800, zoom: 13, sw: [-4.5000, 15.2000], ne: [-4.3600, 15.3400] },
  'ndjili': { lat: -4.3900, lng: 15.3850, zoom: 15, sw: [-4.4100, 15.3700], ne: [-4.3700, 15.4000] },
  'ngaba': { lat: -4.3750, lng: 15.3250, zoom: 15, sw: [-4.3880, 15.3150], ne: [-4.3620, 15.3350] },
  'ngaliema': { lat: -4.3600, lng: 15.2500, zoom: 14, sw: [-4.4000, 15.2100], ne: [-4.3200, 15.2900] },
  'ngiri-ngiri': { lat: -4.3500, lng: 15.3000, zoom: 15, sw: [-4.3620, 15.2900], ne: [-4.3380, 15.3100] },
  'nsele': { lat: -4.3200, lng: 15.5200, zoom: 12, sw: [-4.4500, 15.4300], ne: [-4.2000, 15.6100] },
  'selembao': { lat: -4.3750, lng: 15.2850, zoom: 14, sw: [-4.4000, 15.2600], ne: [-4.3500, 15.3100] },
};

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
  onSelectSignalId,
  onUpdateEboueurPosition,
  onEboueurArrived
}: DechetsMapViewProps) {
  const [selectedSignalId, setSelectedSignalIdState] = useState<string | null>(initialSelectedSignalId || null);
  const [selectedEboueurId, setSelectedEboueurId] = useState<string | null>(null);
  const [showAllParcelles, setShowAllParcelles] = useState<boolean>(false);
  const [selectedCommuneFilter, setSelectedCommuneFilter] = useState<string>('');
  const arrivedSignalsRef = useRef<Set<string>>(new Set());
  
  // Realtime clock tick to auto-hide validated houses after 5 minutes
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [routeGeometries, setRouteGeometries] = useState<Record<string, [number, number][]>>({});

  // Helper to resolve commune coordinates for calibration
  const getCommuneCoords = (communeObj?: Commune | null) => {
    if (!communeObj) return { lat: -4.3316, lng: 15.3139, zoom: 12 };

    const nameKey = communeObj.nom.toLowerCase().trim().replace(/['\s_]+/g, '-');
    for (const key in KINSHASA_COMMUNE_COORDS) {
      if (nameKey.includes(key) || key.includes(nameKey)) {
        return KINSHASA_COMMUNE_COORDS[key];
      }
    }

    // Fallback: If parcelles in this commune have coordinates, calculate average
    const communeAvenues = avenues.filter(a => a.commune_id === communeObj.id).map(a => a.id);
    const communeParcelles = parcelles.filter(p => communeAvenues.includes(p.avenue_id) && p.latitude != null && p.longitude != null);
    
    if (communeParcelles.length > 0) {
      const avgLat = communeParcelles.reduce((acc, p) => acc + (p.latitude || 0), 0) / communeParcelles.length;
      const avgLng = communeParcelles.reduce((acc, p) => acc + (p.longitude || 0), 0) / communeParcelles.length;
      return { lat: avgLat, lng: avgLng, zoom: 14 };
    }

    return { lat: -4.3316, lng: 15.3139, zoom: 12 };
  };

  // Helper to resolve strict commune bounding box for Leaflet boundary locking
  const getCommuneBounds = (communeObj?: Commune | null) => {
    if (!communeObj) return null;
    const nameKey = communeObj.nom.toLowerCase().trim().replace(/['\s_]+/g, '-');
    for (const key in KINSHASA_COMMUNE_COORDS) {
      if (nameKey.includes(key) || key.includes(nameKey)) {
        const cfg = KINSHASA_COMMUNE_COORDS[key];
        return {
          center: { lat: cfg.lat, lng: cfg.lng },
          zoom: cfg.zoom,
          sw: cfg.sw,
          ne: cfg.ne
        };
      }
    }

    const coords = getCommuneCoords(communeObj);
    return {
      center: { lat: coords.lat, lng: coords.lng },
      zoom: coords.zoom,
      sw: [coords.lat - 0.015, coords.lng - 0.018] as [number, number],
      ne: [coords.lat + 0.015, coords.lng + 0.018] as [number, number]
    };
  };

  // History Modal States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'pending' | 'assigned' | 'completed'>('all');

  // Periodically update nowTick every 10 seconds to auto-remove completed markers > 5min
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Compute signals that should be rendered on the interactive Leaflet map
  // Rules:
  // 1. Filter by selectedCommuneFilter if set
  // 2. Always show active alerts ('pending' or 'assigned')
  // 3. If completed, ONLY show if completed within the last 5 minutes (300,000 ms)
  // 4. Always show if explicitly selected (e.g. localized by admin or clicked in history)
  const visibleSignalsOnMap = useMemo(() => {
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    return signals.filter((sig) => {
      if (selectedCommuneFilter) {
        const commObj = communes.find(c => c.id === selectedCommuneFilter);
        const matchCommune = sig.commune_id === selectedCommuneFilter || (commObj && sig.commune_nom?.toLowerCase() === commObj.nom.toLowerCase());
        if (!matchCommune && selectedSignalId !== sig.id) return false;
      }

      if (selectedSignalId === sig.id) return true;

      if (sig.status === 'pending' || sig.status === 'assigned') return true;

      if (sig.status === 'completed') {
        if (!sig.completed_at) return false;
        const completedTime = new Date(sig.completed_at).getTime();
        if (!isNaN(completedTime) && (nowTick - completedTime) <= FIVE_MINUTES_MS) {
          return true;
        }
      }

      return false;
    });
  }, [signals, selectedSignalId, nowTick, selectedCommuneFilter, communes]);

  // Compute active/idle statuses dynamically from current active signals
  const computedEboueurs = useMemo(() => {
    return eboueurs.map(eb => {
      // Find if this eboueur has any active (assigned) mission in the signals array
      const hasActiveMission = signals.some(s => {
        if (s.status !== 'assigned') return false;
        if (!s.assigned_eboueur_id) return false;

        const assignedId = s.assigned_eboueur_id.trim().toLowerCase();
        const ebId = eb.id.trim().toLowerCase();
        const ebNom = eb.nom ? eb.nom.trim().toLowerCase() : '';
        const ebPhone = eb.telephone ? eb.telephone.trim().toLowerCase() : '';

        if (assignedId === ebId) return true;
        if (ebNom && (assignedId === ebNom || ebNom.includes(assignedId) || assignedId.includes(ebNom))) return true;
        if (ebPhone && (assignedId === ebPhone || ebPhone.includes(assignedId) || assignedId.includes(ebPhone))) return true;

        return false;
      });

      return {
        ...eb,
        status: hasActiveMission ? 'en_mission' as const : 'idle' as const
      };
    });
  }, [eboueurs, signals]);

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

  // Filter signals based on active tab & commune filter
  const filteredSignals = useMemo(() => {
    let list = signals;
    if (selectedCommuneFilter) {
      const commObj = communes.find(c => c.id === selectedCommuneFilter);
      list = list.filter(s => s.commune_id === selectedCommuneFilter || (commObj && s.commune_nom?.toLowerCase() === commObj.nom.toLowerCase()));
    }
    if (activeTab === 'all') return list;
    return list.filter(s => s.status === activeTab);
  }, [signals, activeTab, selectedCommuneFilter, communes]);

  // Selected signal details
  const selectedSignal = useMemo(() => {
    return signals.find(s => s.id === selectedSignalId);
  }, [signals, selectedSignalId]);

  // Find parcels with GPS to plot on map (filtered by commune if active)
  const parcelGpsPoints = useMemo(() => {
    let list = parcelles.filter(p => p.latitude != null && p.longitude != null);
    if (selectedCommuneFilter) {
      const communeAvenueIds = avenues.filter(a => a.commune_id === selectedCommuneFilter).map(a => a.id);
      list = list.filter(p => communeAvenueIds.includes(p.avenue_id));
    }
    return list;
  }, [parcelles, selectedCommuneFilter, avenues]);

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

  // Find nearest collectors ranked by Same Commune + 3 Proximity Tiers + Load Balancing Queue Fairness
  const rankedCollectorResults = useMemo(() => {
    if (!selectedSignal) return [];
    const signalCoords = getSignalCoords(selectedSignal);
    
    return rankAndFilterCollectorsForSignal(
      signalCoords,
      selectedSignal.commune_id,
      selectedSignal.commune_nom,
      computedEboueurs,
      signals
    );
  }, [selectedSignal, computedEboueurs, signals]);

  // Backward-compatible array for maps and simulator loops
  const nearestCollectors = useMemo(() => {
    return rankedCollectorResults.map(res => ({
      ...res.eboueur,
      distance: res.distanceKm,
      distanceMeters: res.distanceMeters,
      hasSpace: res.hasSpace,
      freeSpace: res.freeSpace,
      matchResult: res
    }));
  }, [rankedCollectorResults]);

  // Map Leaflet implementation refs & states
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);
  const routeGroupRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isAutoMoving, setIsAutoMoving] = useState(false);

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

    // Plot Visible Signals (Pending, Assigned, Completed < 5min, or Selected)
    visibleSignalsOnMap.forEach((sig) => {
      const coords = getSignalCoords(sig);
      const isSelected = selectedSignalId === sig.id;
      const isPending = sig.status === 'pending';
      const isAssigned = sig.status === 'assigned';
      const isCompleted = sig.status === 'completed';

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
            <div class="relative p-2 rounded-full ${markerColor} text-white border-2 ${isSelected ? 'border-yellow-400 scale-110' : 'border-white'} shadow-md flex items-center justify-center font-bold" style="width: 36px; height: 36px; font-size: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
              🏠
              <span class="absolute -top-1.5 -right-1.5 text-[10px] bg-slate-900 border border-white rounded-full px-1 shadow">
                ${iconHtml}
              </span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = window.L.marker([coords.lat, coords.lng], { icon: customIcon });
      
      const completedAgoSec = sig.completed_at ? Math.max(0, Math.floor((nowTick - new Date(sig.completed_at).getTime()) / 1000)) : 0;
      const remainingSec = Math.max(0, 300 - completedAgoSec);
      const remainingMin = Math.ceil(remainingSec / 60);

      marker.bindPopup(`
        <div class="text-xs p-1 leading-normal" style="color: #0b1c30; font-family: sans-serif;">
          <strong class="text-primary block font-bold text-sm mb-1">Parcelle N° ${sig.numero_parcelle}</strong>
          <strong>Avenue:</strong> ${sig.avenue_nom}<br/>
          <strong>Commune:</strong> ${sig.commune_nom}<br/>
          <strong>Bailleur:</strong> ${sig.bailleur_nom}<br/>
          <strong>Signalé à:</strong> ${sig.reported_at.substring(11, 16)}<br/>
          <strong>Position GPS HD:</strong> <span style="font-family: monospace; font-size: 11px;">${coords.lat.toFixed(8)}, ${coords.lng.toFixed(8)}</span> <span style="color: #10b981; font-weight: bold;">(🎯 100% HD)</span><br/>
          ${isCompleted ? `<div class="mt-1 font-bold text-[10px] text-emerald-700 bg-emerald-50 p-1 rounded border border-emerald-200">✅ Action validée — Masquage automatique dans ${remainingMin} min</div>` : ''}
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

    // Plot Eboueurs (collectors) - filtered by commune if active
    computedEboueurs
      .filter(eb => eb.gps_active && eb.latitude != null && eb.longitude != null && !isNaN(eb.latitude) && !isNaN(eb.longitude))
      .filter(eb => {
        if (!selectedCommuneFilter) return true;
        const commObj = communes.find(c => c.id === selectedCommuneFilter);
        if (!commObj) return true;

        const matchZone = eb.zone_id === selectedCommuneFilter || (eb.zone_nom && eb.zone_nom.toLowerCase().includes(commObj.nom.toLowerCase()));
        const assignedInCommune = signals.some(s => s.assigned_eboueur_id === eb.id && (s.commune_id === selectedCommuneFilter || s.commune_nom?.toLowerCase() === commObj.nom.toLowerCase()));

        const boundsInfo = getCommuneBounds(commObj);
        let insideBounds = false;
        if (boundsInfo && eb.latitude != null && eb.longitude != null) {
          insideBounds = eb.latitude >= boundsInfo.sw[0] && eb.latitude <= boundsInfo.ne[0] &&
                         eb.longitude >= boundsInfo.sw[1] && eb.longitude <= boundsInfo.ne[1];
        }

        return matchZone || assignedInCommune || insideBounds;
      })
      .forEach((eb) => {
      const isSelected = selectedEboueurId === eb.id;
      const isBusy = eb.status === 'en_mission';
      const cap = eb.capacite_camion || 6;
      const load = eb.charge_actuelle || 0;
      const isFull = load >= cap;

      const customIcon = window.L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center transition-all duration-300" style="transform: ${isSelected ? 'scale(1.25)' : 'scale(1.0)'}; z-index: ${isSelected ? '9999' : '100'};">
            <span class="absolute inline-flex h-7 w-7 rounded-full ${isFull ? 'bg-red-500/30' : 'bg-blue-500/20'} animate-pulse"></span>
            <div class="p-2 rounded-full ${isFull ? 'bg-red-600' : 'bg-blue-600'} text-white border-2 ${isSelected ? 'border-yellow-400 scale-110' : 'border-white'} shadow-md flex items-center justify-center" style="width: 34px; height: 34px; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
              🚚
            </div>
            <div class="absolute -top-3 -right-2 text-[9px] font-extrabold font-mono ${isFull ? 'bg-red-600 text-white' : 'bg-slate-900 text-amber-300'} px-1.5 py-0.5 rounded-full border border-slate-700 shadow-sm whitespace-nowrap">
              ${load}/${cap}
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = window.L.marker([eb.latitude, eb.longitude], { icon: customIcon });

      marker.bindPopup(`
        <div class="text-xs p-1 leading-normal" style="color: #0b1c30; font-family: sans-serif;">
          <strong class="text-secondary block font-bold text-sm mb-1">${eb.nom}</strong>
          <strong>Téléphone:</strong> ${eb.telephone}<br/>
          <strong>Statut:</strong> ${isBusy ? 'En mission active 🚚' : 'Disponible 🔋'}<br/>
          <strong>Chargement Camion:</strong> <span style="font-family: monospace; font-weight: bold; color: ${isFull ? '#ef4444' : '#10b981'};">${load} / ${cap} sachets</span> ${isFull ? '🚨 [CAMION PLEIN]' : `(${cap - load} places libres)`}<br/>
          <strong>Position Véhicule HD:</strong> <span style="font-family: monospace; font-size: 11px;">${eb.latitude.toFixed(8)}, ${eb.longitude.toFixed(8)}</span> <span style="color: #10b981; font-weight: bold;">(🎯 100% HD)</span>
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

  }, [isMapReady, visibleSignalsOnMap, computedEboueurs, selectedSignalId, selectedEboueurId, showAllParcelles, parcelGpsPoints, abonnes, avenues, communes, nowTick]);

  // Render Blue Polyline Routes & Live Distance/ETA Badges on Map (following real avenues)
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.L) return;

    const map = mapRef.current;

    if (!routeGroupRef.current) {
      routeGroupRef.current = window.L.layerGroup().addTo(map);
    } else {
      routeGroupRef.current.clearLayers();
    }

    const routeGroup = routeGroupRef.current;

    const routesToDraw: Array<{
      key: string;
      eboueur: Eboueur;
      signal: PoubelleSignal;
      sigCoords: { lat: number; lng: number };
    }> = [];

    // Assigned signals
    signals.forEach((sig) => {
      if (sig.status === 'assigned' && sig.assigned_eboueur_id) {
        const eb = computedEboueurs.find(e => 
          e.id === sig.assigned_eboueur_id || 
          (e.nom && e.nom.toLowerCase().includes(sig.assigned_eboueur_id!.toLowerCase()))
        );
        if (eb && eb.latitude != null && eb.longitude != null) {
          const sigCoords = getSignalCoords(sig);
          const key = `${eb.id}_${sig.id}_${eb.latitude.toFixed(4)}_${eb.longitude.toFixed(4)}`;
          routesToDraw.push({ key, eboueur: eb, signal: sig, sigCoords });
        }
      }
    });

    // Selected signal pending
    if (selectedSignalId) {
      const selSig = signals.find(s => s.id === selectedSignalId);
      if (selSig && selSig.status === 'pending') {
        const sigCoords = getSignalCoords(selSig);
        const nearestEb = nearestCollectors.find(e => e.hasSpace && e.latitude != null && e.longitude != null);
        if (nearestEb && nearestEb.latitude != null && nearestEb.longitude != null) {
          const key = `${nearestEb.id}_${selSig.id}_${nearestEb.latitude.toFixed(4)}_${nearestEb.longitude.toFixed(4)}`;
          routesToDraw.push({ key, eboueur: nearestEb, signal: selSig, sigCoords });
        }
      }
    }

    // Trigger async fetch for missing street routes
    routesToDraw.forEach(({ key, eboueur, sigCoords }) => {
      if (!routeGeometries[key] && eboueur.latitude != null && eboueur.longitude != null) {
        fetchStreetRoute(eboueur.latitude, eboueur.longitude, sigCoords.lat, sigCoords.lng).then((coords) => {
          setRouteGeometries(prev => ({ ...prev, [key]: coords }));
        });
      }
    });

    // Draw polylines
    routesToDraw.forEach(({ key, eboueur, sigCoords }) => {
      if (eboueur.latitude == null || eboueur.longitude == null) return;

      const path = routeGeometries[key] || [
        [eboueur.latitude, eboueur.longitude],
        [eboueur.latitude, sigCoords.lng],
        [sigCoords.lat, sigCoords.lng]
      ];

      window.L.polyline(
        path,
        {
          color: '#2563eb', // Royal Blue
          weight: 6,
          opacity: 0.85,
          dashArray: '8, 8',
          lineCap: 'round'
        }
      ).addTo(routeGroup);
    });

  }, [isMapReady, signals, computedEboueurs, selectedSignalId, nearestCollectors, routeGeometries]);

  // Live Auto-Movement Loop towards active signal target (3.0 km/h)
  useEffect(() => {
    if (!isAutoMoving) return;

    const interval = setInterval(() => {
      const activeSig = signals.find(s => s.status === 'assigned' && s.assigned_eboueur_id) || signals.find(s => s.id === selectedSignalId);
      if (!activeSig) {
        setIsAutoMoving(false);
        return;
      }

      const assignedEb = computedEboueurs.find(e => 
        e.id === activeSig.assigned_eboueur_id || 
        (e.nom && activeSig.assigned_eboueur_id && e.nom.toLowerCase().includes(activeSig.assigned_eboueur_id.toLowerCase()))
      ) || nearestCollectors[0] || computedEboueurs[0];

      if (!assignedEb || assignedEb.latitude == null || assignedEb.longitude == null) {
        setIsAutoMoving(false);
        return;
      }

      const sigCoords = getSignalCoords(activeSig);
      const res = advancePositionTowardsTarget(
        assignedEb.latitude,
        assignedEb.longitude,
        sigCoords.lat,
        sigCoords.lng,
        8.0 // 8 meters advance per tick
      );

      if (onUpdateEboueurPosition) {
        onUpdateEboueurPosition(assignedEb.id, res.latitude, res.longitude);
      }

      if (res.arrived) {
        setIsAutoMoving(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoMoving, signals, computedEboueurs, selectedSignalId, nearestCollectors, onUpdateEboueurPosition]);

  // Proximity check effect: triggers arrival notification when eboueur is <= 15m from parcel
  useEffect(() => {
    const activeAssignedSig = (selectedSignalId ? signals.find(s => s.id === selectedSignalId && s.status === 'assigned') : null) 
      || signals.find(s => s.status === 'assigned' && s.assigned_eboueur_id);

    if (!activeAssignedSig) return;

    const assignedEb = computedEboueurs.find(e => 
      e.id === activeAssignedSig.assigned_eboueur_id || 
      (e.nom && activeAssignedSig.assigned_eboueur_id && e.nom.toLowerCase().includes(activeAssignedSig.assigned_eboueur_id.toLowerCase()))
    ) || nearestCollectors[0] || computedEboueurs[0];

    if (!assignedEb || assignedEb.latitude == null || assignedEb.longitude == null) return;

    const coords = getSignalCoords(activeAssignedSig);
    const distM = getDistanceMeters(assignedEb.latitude, assignedEb.longitude, coords.lat, coords.lng);

    if (distM <= 15 && !arrivedSignalsRef.current.has(activeAssignedSig.id)) {
      arrivedSignalsRef.current.add(activeAssignedSig.id);
      if (onEboueurArrived) {
        onEboueurArrived({
          signalId: activeAssignedSig.id,
          eboueurNom: assignedEb.nom,
          bailleurNom: activeAssignedSig.bailleur_nom || 'Bailleur',
          numeroParcelle: activeAssignedSig.numero_parcelle,
          avenueNom: activeAssignedSig.avenue_nom,
          communeNom: activeAssignedSig.commune_nom,
          distanceM: distM
        });
      }
    }
  }, [signals, computedEboueurs, selectedSignalId, nearestCollectors, onEboueurArrived]);

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
      const eb = computedEboueurs.find(e => e.id === selectedEboueurId);
      if (eb && eb.gps_active && eb.latitude != null && eb.longitude != null && !isNaN(eb.latitude) && !isNaN(eb.longitude)) {
        mapRef.current.flyTo([eb.latitude, eb.longitude], 15, {
          animate: true,
          duration: 1.2
        });
      }
    }
  }, [selectedSignalId, selectedEboueurId, isMapReady]);

  // Calibrate, restrict spatial bounds & lock zoom level when selectedCommuneFilter changes
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.L) return;

    const map = mapRef.current;

    if (selectedCommuneFilter) {
      const commObj = communes.find(c => c.id === selectedCommuneFilter);
      const boundsInfo = getCommuneBounds(commObj);

      if (boundsInfo) {
        const leafletBounds = window.L.latLngBounds(boundsInfo.sw, boundsInfo.ne);

        // Strict spatial boundary locking: user cannot drag/pan out of the commune
        map.setMaxBounds(leafletBounds);
        map.options.maxBoundsViscosity = 1.0;

        // Strict zoom locking: user cannot zoom out to neighboring communes
        map.setMinZoom(boundsInfo.zoom);
        map.setMaxZoom(18);

        // Fit map tightly to commune bounds
        map.fitBounds(leafletBounds, {
          animate: true,
          padding: [15, 15]
        });
      }
    } else {
      // Global view: unlock spatial bounds and zoom
      map.setMaxBounds(null);
      map.setMinZoom(10);
      map.setMaxZoom(18);

      if (!selectedSignalId && !selectedEboueurId) {
        map.flyTo([-4.3316, 15.3139], 12, {
          animate: true,
          duration: 1.5
        });
      }
    }
  }, [selectedCommuneFilter, isMapReady, communes]);

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
          
          {/* Commune Calibration & Filtering Control Box */}
          <div className="bg-surface rounded-3xl border border-outline-variant p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/15 text-primary border border-primary/20 shrink-0">
                <Navigation size={20} className="animate-pulse" />
              </div>
              <div>
                <label htmlFor="commune-calibrage-select" className="text-xs font-extrabold text-on-background uppercase tracking-wider block">
                  Calibrage & Centrage par Commune
                </label>
                <p className="text-[11px] text-on-surface-variant font-medium">
                  Sélectionnez une commune pour recadrer automatiquement la carte Leaflet et filtrer la zone d'intervention.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                <select
                  id="commune-calibrage-select"
                  value={selectedCommuneFilter}
                  onChange={(e) => {
                    setSelectedCommuneFilter(e.target.value);
                    setSelectedSignalId(null);
                    setSelectedEboueurId(null);
                  }}
                  className="w-full bg-background border border-outline-variant rounded-xl px-3 py-2 text-xs font-bold text-on-background focus:outline-none focus:border-primary shadow-inner appearance-none cursor-pointer pr-8"
                >
                  <option value="">🌐 Toutes les communes (Kinshasa Global)</option>
                  {communes.map((c) => (
                    <option key={c.id} value={c.id}>
                      📍 Commune de {c.nom}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-xs font-bold">
                  ▼
                </div>
              </div>

              {selectedCommuneFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCommuneFilter('');
                    setSelectedSignalId(null);
                    setSelectedEboueurId(null);
                  }}
                  className="bg-error/15 hover:bg-error/25 text-error border border-error/25 px-2.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                  title="Réinitialiser au cadrage global"
                >
                  <X size={14} />
                  <span className="hidden sm:inline">Réinitialiser</span>
                </button>
              )}
            </div>
          </div>

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
                    <span>Éboueurs Actifs ({computedEboueurs.filter(e => e.gps_active).length})</span>
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

              {/* Calibration Active Badge on Map */}
              {selectedCommuneFilter && (
                <div className="absolute top-4 left-4 bg-background/95 border border-primary/40 px-3.5 py-2 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs font-extrabold text-primary backdrop-blur-md shadow-xl z-[500] animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                    </span>
                    <span>📍 Zone Exclusive : Commune de {communes.find(c => c.id === selectedCommuneFilter)?.nom || 'Sélectionnée'}</span>
                  </div>
                  <span className="text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                    🔒 Limites strictes verrouillées
                  </span>
                </div>
              )}

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
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="text-[10px] text-on-surface-variant flex items-center gap-1 italic">
                      <Clock size={11} /> Signalé à {selectedSignal.reported_at.substring(11, 16)} le {selectedSignal.reported_at.substring(0, 10)}
                    </span>
                    {(selectedSignal.is_hors_delai || (selectedSignal.reported_at && new Date(selectedSignal.reported_at).getHours() >= 13)) && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                        <Clock size={11} className="text-amber-400 animate-pulse" /> ⏰ Signal Tardif (&gt;13h)
                      </span>
                    )}
                  </div>
                </div>

                {/* Dispatch & Closest Collector Section */}
                {selectedSignal.status === 'pending' ? (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Truck size={14} />
                        Éboueurs Classés (Commune & Niveaux de Proximité)
                      </span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono font-normal">
                        Algorithme Équitable
                      </span>
                    </h4>

                    {rankedCollectorResults.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic p-2.5 bg-background/50 rounded-lg text-center border border-outline-variant/40">
                        Aucun éboueur n'a son GPS actif actuellement. Demandez aux éboueurs d'activer leur géolocalisation.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                        {rankedCollectorResults.map((res) => {
                          const eb = res.eboueur;
                          const cap = eb.capacite_camion || 6;
                          const load = eb.charge_actuelle || 0;
                          const isFull = !res.hasSpace;

                          return (
                            <div 
                              key={eb.id}
                              className={`p-3 border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-background/40 hover:bg-background/80 transition-colors ${
                                isFull ? 'border-red-500/30 bg-red-500/5' : eb.status === 'en_mission' ? 'border-amber-500/30 bg-amber-500/5' : 'border-outline-variant'
                              }`}
                            >
                              <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-on-surface">
                                    {eb.nom}
                                  </span>

                                  {/* Commune Badge */}
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold font-mono ${
                                    res.isSameCommune 
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                      : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                                  }`}>
                                    {res.isSameCommune ? '📍 Même commune' : '📍 Zone voisine'}
                                  </span>

                                  {/* Proximity Tier Badge */}
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold font-mono ${res.tierBadgeColor}`}>
                                    {res.tierLabel}
                                  </span>

                                  {isFull && (
                                    <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-black">
                                      🚨 Plein ({load}/{cap})
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] text-on-surface-variant flex items-center gap-2 flex-wrap font-mono">
                                  <span>Distance GPS : <strong className="text-secondary">{res.distanceKm} km ({res.distanceMeters} m)</strong></span>
                                  <span>•</span>
                                  <span className={isFull ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                    📦 Camion : {load}/{cap} {isFull ? '(Saturé)' : `(${res.freeSpace} places)`}
                                  </span>
                                  <span>•</span>
                                  <span className="text-amber-300 font-semibold">
                                    ⏳ File d'attente : {res.activeTaskCount} mission(s)
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (isFull) {
                                    alert(`🚨 CAPACITÉ SATURÉE !\n\nLe véhicule de M. ${eb.nom} est actuellement PLEIN (${load}/${cap} sachets chargés).\n\nL'éboueur doit d'abord décharger son camion au centre d'enfouissement avant de recevoir de nouvelles missions.`);
                                    return;
                                  }
                                  onAssignMission(selectedSignal.id, eb.id);
                                  setSelectedSignalId(null);
                                  alert(`Mission envoyée à l'éboueur ${eb.nom} ! Un SMS/Notification lui a été transmis.`);
                                }}
                                className={`w-full sm:w-auto px-3 py-2 font-extrabold text-[10px] rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                                  isFull 
                                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40' 
                                    : 'bg-[#10b981] hover:bg-[#10b981]/90 text-white'
                                }`}
                              >
                                <Send size={12} />
                                <span>Assigner Mission</span>
                              </button>
                            </div>
                          );
                        })}
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
              const eb = computedEboueurs.find(e => e.id === selectedEboueurId);
              if (!eb) return null;
              
              // Find the active mission assigned to this eboueur (with support for test bypass)
              const activeMission = signals.find(s => {
                if (s.status !== 'assigned') return false;
                if (!s.assigned_eboueur_id) return false;

                const assignedId = s.assigned_eboueur_id.trim().toLowerCase();
                const ebId = eb.id.trim().toLowerCase();
                const ebNom = eb.nom ? eb.nom.trim().toLowerCase() : '';
                const ebPhone = eb.telephone ? eb.telephone.trim().toLowerCase() : '';

                if (assignedId === ebId) return true;
                if (ebNom && (assignedId === ebNom || ebNom.includes(assignedId) || assignedId.includes(ebNom))) return true;
                if (ebPhone && (assignedId === ebPhone || ebPhone.includes(assignedId) || assignedId.includes(ebPhone))) return true;

                return false;
              });
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
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Coordonnées GPS Véhicule :</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-on-surface font-bold">{eb.latitude.toFixed(8)}, {eb.longitude.toFixed(8)}</span>
                        <span className="text-[9px] bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20 px-1.5 py-0.2 rounded font-extrabold">100% HD</span>
                      </div>
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

          {/* Live Blue Route Tracking & ETA Block (Shows when admin assigns an eboueur) */}
          {(() => {
            const activeAssignedSig = (selectedSignalId ? signals.find(s => s.id === selectedSignalId && s.status === 'assigned') : null) 
              || signals.find(s => s.status === 'assigned' && s.assigned_eboueur_id);

            if (!activeAssignedSig) return null;

            const assignedEb = computedEboueurs.find(e => 
              e.id === activeAssignedSig.assigned_eboueur_id || 
              (e.nom && activeAssignedSig.assigned_eboueur_id && e.nom.toLowerCase().includes(activeAssignedSig.assigned_eboueur_id.toLowerCase()))
            ) || nearestCollectors[0] || computedEboueurs[0];

            if (!assignedEb || assignedEb.latitude == null || assignedEb.longitude == null) return null;

            const coords = getSignalCoords(activeAssignedSig);
            const distM = getDistanceMeters(assignedEb.latitude, assignedEb.longitude, coords.lat, coords.lng);
            const eta = calculateCartETA(distM, 3.0);

            return (
              <div className="bg-slate-950 border border-blue-500/40 rounded-2xl p-3.5 text-white shadow-xl flex flex-col gap-2.5 animate-fade-in shrink-0">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                    <Truck size={15} className="animate-bounce text-blue-400" />
                    Suivi Tracé Bleu (Chariot 3.0 km/h)
                  </span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold px-2 py-0.5 rounded-full">
                    En direct GPS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-medium block">Éboueur assigné</span>
                    <span className="font-extrabold text-white text-xs truncate block" title={assignedEb.nom}>{assignedEb.nom}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-medium block">Destination</span>
                    <span className="font-extrabold text-amber-400 text-xs truncate block" title={`Parcelle N° ${activeAssignedSig.numero_parcelle}`}>
                      Parcelle N° {activeAssignedSig.numero_parcelle}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-950/40 border border-blue-800/40 p-2.5 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-300 font-semibold">Distance & Arrivée</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-black font-mono text-amber-400">{distM} m</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-xs font-black text-emerald-400">{eta.formatted}</span>
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const res = advancePositionTowardsTarget(
                          assignedEb.latitude!,
                          assignedEb.longitude!,
                          coords.lat,
                          coords.lng,
                          8.0
                        );
                        if (onUpdateEboueurPosition) {
                          onUpdateEboueurPosition(assignedEb.id, res.latitude, res.longitude);
                        }
                      }}
                      className="px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-extrabold transition-all active:scale-95 shadow cursor-pointer flex items-center gap-0.5"
                      title="Avancer l'éboueur de 8 mètres"
                    >
                      <span>🚶‍♂️ +8m</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAutoMoving(!isAutoMoving)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-extrabold transition-all active:scale-95 shadow cursor-pointer flex items-center gap-0.5 ${
                        isAutoMoving ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isAutoMoving ? '⏸️ Pause' : '▶️ Auto'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Section B: Signal Logs / Mission Feed (Shows 10 most recent) */}
          <div className="bg-surface border border-outline-variant rounded-2xl flex flex-col h-[320px]">
            {/* Header / Tabs */}
            <div className="p-3 border-b border-outline-variant/50 flex flex-col gap-2 shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                  <Bell size={12} className="text-error" /> Journal des alertes
                </span>
                <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 font-bold px-1.5 py-0.5 rounded-full">
                  10 plus récentes
                </span>
              </div>
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

            {/* List area (Top 10 signals) */}
            <div className="flex-grow overflow-y-auto p-2 flex flex-col gap-1.5">
              {(() => {
                const recentTen = [...filteredSignals]
                  .sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime())
                  .slice(0, 10);

                if (recentTen.length === 0) {
                  return (
                    <div className="text-center py-10 text-xs text-on-surface-variant italic">
                      Aucun signalement trouvé.
                    </div>
                  );
                }

                return recentTen.map((sig) => {
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
                              éboueur : {computedEboueurs.find(e => e.id === sig.assigned_eboueur_id)?.nom.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Bottom Trigger for Full History */}
            <div className="p-2 border-t border-outline-variant/40 bg-background/30">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="w-full py-2 px-3 bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <History size={14} />
                <span>Voir l'Historique complet ({signals.length}) 📋</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* HISTORIQUE COMPLET DES ALERTES MODAL                                      */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-outline-variant flex justify-between items-center bg-background/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-secondary/15 text-secondary rounded-2xl border border-secondary/20">
                  <History size={24} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-on-surface">
                    Historique Complet des Alertes de Salubrité
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium">
                    Registre officiel de toutes les alertes reçues, missions assignées et nettoyages effectués à Kinshasa.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 rounded-xl bg-surface hover:bg-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer border border-outline-variant/50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-background/30 border-b border-outline-variant/60">
              <div className="bg-surface p-3 rounded-2xl border border-outline-variant/60 flex flex-col">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Alertes</span>
                <span className="text-xl font-black text-on-surface">{signals.length}</span>
              </div>
              <div className="bg-surface p-3 rounded-2xl border border-error/20 flex flex-col">
                <span className="text-[10px] font-bold text-error uppercase tracking-wider">Poubelles Pleines</span>
                <span className="text-xl font-black text-error">
                  {signals.filter(s => s.status === 'pending').length}
                </span>
              </div>
              <div className="bg-surface p-3 rounded-2xl border border-yellow-500/20 flex flex-col">
                <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">Missions en cours</span>
                <span className="text-xl font-black text-yellow-500">
                  {signals.filter(s => s.status === 'assigned').length}
                </span>
              </div>
              <div className="bg-surface p-3 rounded-2xl border border-emerald-500/20 flex flex-col">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Nettoyées / Vidées</span>
                <span className="text-xl font-black text-emerald-500">
                  {signals.filter(s => s.status === 'completed').length}
                </span>
              </div>
            </div>

            {/* Modal Controls: Search & Filters */}
            <div className="p-4 border-b border-outline-variant/60 flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface">
              {/* Search Bar */}
              <div className="relative w-full sm:w-96">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Rechercher par parcelle, bailleur, avenue, commune..."
                  className="w-full h-10 pl-9 pr-8 bg-background border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                />
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex bg-background border border-outline-variant p-1 rounded-xl text-xs font-bold w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setHistoryStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    historyStatusFilter === 'all' ? 'bg-secondary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Toutes ({signals.length})
                </button>
                <button
                  onClick={() => setHistoryStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    historyStatusFilter === 'pending' ? 'bg-error text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Pleines ({signals.filter(s => s.status === 'pending').length})
                </button>
                <button
                  onClick={() => setHistoryStatusFilter('assigned')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    historyStatusFilter === 'assigned' ? 'bg-yellow-500 text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  En cours ({signals.filter(s => s.status === 'assigned').length})
                </button>
                <button
                  onClick={() => setHistoryStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    historyStatusFilter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Vidées ({signals.filter(s => s.status === 'completed').length})
                </button>
              </div>
            </div>

            {/* Modal Table Body */}
            <div className="flex-grow overflow-y-auto p-4">
              {(() => {
                const filteredHistory = signals.filter(sig => {
                  if (historyStatusFilter !== 'all' && sig.status !== historyStatusFilter) return false;

                  if (historySearch.trim()) {
                    const q = historySearch.toLowerCase().trim();
                    const matchParcelle = sig.numero_parcelle.toLowerCase().includes(q);
                    const matchBailleur = sig.bailleur_nom.toLowerCase().includes(q);
                    const matchPhone = sig.bailleur_telephone ? sig.bailleur_telephone.toLowerCase().includes(q) : false;
                    const matchAvenue = sig.avenue_nom.toLowerCase().includes(q);
                    const matchCommune = sig.commune_nom.toLowerCase().includes(q);
                    const ebObj = sig.assigned_eboueur_id ? eboueurs.find(e => e.id === sig.assigned_eboueur_id) : null;
                    const matchEboueur = ebObj ? ebObj.nom.toLowerCase().includes(q) : false;

                    return matchParcelle || matchBailleur || matchPhone || matchAvenue || matchCommune || matchEboueur;
                  }
                  return true;
                }).sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());

                if (filteredHistory.length === 0) {
                  return (
                    <div className="text-center py-16 text-on-surface-variant">
                      <Trash2 size={36} className="mx-auto opacity-30 mb-2" />
                      <p className="text-sm font-semibold">Aucune alerte ne correspond à votre recherche.</p>
                      <button
                        onClick={() => { setHistorySearch(''); setHistoryStatusFilter('all'); }}
                        className="mt-3 px-4 py-1.5 bg-surface border border-outline-variant rounded-xl text-xs font-bold text-primary hover:bg-background cursor-pointer"
                      >
                        Réinitialiser les filtres
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/60 text-on-surface-variant uppercase text-[10px] font-black tracking-wider bg-background/50">
                          <th className="p-3">Statut</th>
                          <th className="p-3">Adresse & Parcelle</th>
                          <th className="p-3">Bailleur / Contact</th>
                          <th className="p-3">Agent Éboueur</th>
                          <th className="p-3">Date Signalement</th>
                          <th className="p-3">Date Validation</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30 font-medium text-on-surface">
                        {filteredHistory.map((sig) => {
                          const isPending = sig.status === 'pending';
                          const isAssigned = sig.status === 'assigned';
                          const assignedEb = sig.assigned_eboueur_id ? eboueurs.find(e => e.id === sig.assigned_eboueur_id) : null;

                          return (
                            <tr key={sig.id} className="hover:bg-background/60 transition-colors">
                              <td className="p-3 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                                  isPending 
                                    ? 'bg-error/15 text-error border-error/30' 
                                    : isAssigned 
                                      ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' 
                                      : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                }`}>
                                  {isPending ? '🚨 Poubelle Pleine' : isAssigned ? '🚚 En Mission' : '✅ Vidée / Traitée'}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-on-surface">N° {sig.numero_parcelle}, Av. {sig.avenue_nom}</div>
                                <div className="text-[10px] text-on-surface-variant">{sig.commune_nom}</div>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-on-surface">{sig.bailleur_nom}</div>
                                <div className="text-[10px] text-on-surface-variant font-mono">{sig.bailleur_telephone || 'Non renseigné'}</div>
                              </td>
                              <td className="p-3">
                                {assignedEb ? (
                                  <div>
                                    <div className="font-bold text-secondary">{assignedEb.nom}</div>
                                    <div className="text-[10px] text-on-surface-variant font-mono">{assignedEb.telephone}</div>
                                  </div>
                                ) : (
                                  <span className="text-on-surface-variant italic text-[11px]">Non encore assigné</span>
                                )}
                              </td>
                              <td className="p-3 whitespace-nowrap font-mono text-[11px] text-on-surface-variant">
                                {sig.reported_at.replace('T', ' à ').substring(0, 18)}
                              </td>
                              <td className="p-3 whitespace-nowrap font-mono text-[11px]">
                                {sig.completed_at ? (
                                  <span className="text-emerald-600 font-bold">
                                    {sig.completed_at.replace('T', ' à ').substring(0, 18)}
                                  </span>
                                ) : (
                                  <span className="text-on-surface-variant italic">—</span>
                                )}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsHistoryModalOpen(false);
                                    setSelectedSignalId(sig.id);
                                    setSelectedEboueurId(null);
                                  }}
                                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 ml-auto cursor-pointer"
                                >
                                  <MapPin size={13} />
                                  <span>Localiser 📍</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant bg-background/50 flex justify-between items-center text-xs text-on-surface-variant">
              <span>Affiche {signals.length} alertes enregistrées sur le réseau.</span>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-2 bg-surface hover:bg-outline-variant/30 text-on-surface border border-outline-variant rounded-xl font-bold transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
