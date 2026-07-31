import React, { useEffect, useRef, useState } from 'react';
import { getDistanceMeters, calculateCartETA } from '../lib/geoUtils';
import { Navigation, Truck, Home, Clock } from 'lucide-react';

declare global {
  interface Window {
    L: any;
  }
}

interface CartRouteTrackingMapProps {
  collectorLat: number;
  collectorLng: number;
  collectorName: string;
  targetLat: number;
  targetLng: number;
  targetLabel: string;
  height?: string;
  onAdvanceStep?: () => void;
  showSimulateButton?: boolean;
}

export const CartRouteTrackingMap: React.FC<CartRouteTrackingMapProps> = ({
  collectorLat,
  collectorLng,
  collectorName,
  targetLat,
  targetLng,
  targetLabel,
  height = "240px",
  onAdvanceStep,
  showSimulateButton = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  // Compute live metrics (cart walking speed = 3.0 km/h)
  const distanceMeters = getDistanceMeters(collectorLat, collectorLng, targetLat, targetLng);
  const eta = calculateCartETA(distanceMeters, 3.0);

  // Fetch real road route geometry following real street avenues (via OSRM)
  useEffect(() => {
    let isMounted = true;
    const fetchRealRoadRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${collectorLng},${collectorLat};${targetLng},${targetLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("OSRM route error");
        const data = await res.json();
        if (data.routes && data.routes[0] && data.routes[0].geometry?.coordinates) {
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            (pt: [number, number]) => [pt[1], pt[0]]
          );
          if (isMounted && coords.length > 0) {
            setRoutePath(coords);
            return;
          }
        }
      } catch (err) {
        console.warn("OSRM routing fallback to orthogonal avenue geometry:", err);
      }
      // Orthogonal street fallback following street axes
      if (isMounted) {
        setRoutePath([
          [collectorLat, collectorLng],
          [collectorLat, targetLng],
          [targetLat, targetLng]
        ]);
      }
    };

    fetchRealRoadRoute();
    return () => { isMounted = false; };
  }, [collectorLat, collectorLng, targetLat, targetLng]);

  // Initialize Leaflet Map
  useEffect(() => {
    let intervalId: any;

    const initMap = () => {
      if (!window.L || !mapContainerRef.current) return false;
      if (mapRef.current) return true;

      try {
        const midLat = (collectorLat + targetLat) / 2;
        const midLng = (collectorLng + targetLng) / 2;

        const map = window.L.map(mapContainerRef.current, {
          center: [midLat, midLng],
          zoom: 15,
          zoomControl: false,
          attributionControl: false
        });

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        mapRef.current = map;
        setIsReady(true);
        return true;
      } catch (err) {
        console.error("CartRouteTrackingMap init error:", err);
        return false;
      }
    };

    if (!initMap()) {
      intervalId = setInterval(() => {
        if (initMap()) clearInterval(intervalId);
      }, 300);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsReady(false);
      }
    };
  }, []);

  // Update Markers & Blue Route Polyline
  useEffect(() => {
    if (!isReady || !mapRef.current || !window.L) return;

    const map = mapRef.current;

    if (!layerGroupRef.current) {
      layerGroupRef.current = window.L.layerGroup().addTo(map);
    } else {
      layerGroupRef.current.clearLayers();
    }

    const group = layerGroupRef.current;

    // 1. Collector Marker 🚚
    const collectorIcon = window.L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex h-8 w-8 rounded-full bg-blue-500/40 animate-ping"></span>
          <div class="relative p-2 rounded-full bg-blue-600 text-white border-2 border-white shadow-lg flex items-center justify-center font-bold" style="width: 32px; height: 32px; font-size: 14px;">
            🚚
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const collectorMarker = window.L.marker([collectorLat, collectorLng], { icon: collectorIcon });
    collectorMarker.bindPopup(`<b>Éboueur: ${collectorName}</b><br/>Position en temps réel`);
    collectorMarker.addTo(group);

    // 2. Target House Marker 🏠
    const houseIcon = window.L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="p-2 rounded-full bg-amber-500 text-white border-2 border-white shadow-lg flex items-center justify-center font-bold" style="width: 32px; height: 32px; font-size: 14px;">
            🏠
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const houseMarker = window.L.marker([targetLat, targetLng], { icon: houseIcon });
    houseMarker.bindPopup(`<b>Destination: ${targetLabel}</b>`);
    houseMarker.addTo(group);

    // 3. Draw Blue Route Line following real avenues (Tracé en bleu)
    const lineCoords = routePath.length > 0 
      ? routePath 
      : [[collectorLat, collectorLng], [collectorLat, targetLng], [targetLat, targetLng]];

    const polyline = window.L.polyline(
      lineCoords,
      {
        color: '#2563eb', // Vivid Blue
        weight: 5,
        opacity: 0.9,
        dashArray: '8, 8',
        lineCap: 'round'
      }
    ).addTo(group);

    // Midpoint Tooltip
    const midIndex = Math.floor(lineCoords.length / 2);
    const tooltipPos = lineCoords[midIndex] || [(collectorLat + targetLat) / 2, (collectorLng + targetLng) / 2];

    const tooltip = window.L.tooltip({
      permanent: true,
      direction: 'center',
      className: 'route-eta-badge'
    })
      .setContent(`
        <div style="background: #0f172a; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; border: 1.5px solid #3b82f6; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
          <span style="color: #60a5fa;">📍 ${distanceMeters}m</span>
          <span style="color: #64748b;">•</span>
          <span style="color: #fbbf24;">⏱️ ${eta.formatted}</span>
        </div>
      `)
      .setLatLng(tooltipPos as [number, number]);

    group.addLayer(tooltip);

    // Fit map bounds smoothly
    try {
      const bounds = window.L.latLngBounds(lineCoords);
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
    } catch (_) {}

  }, [isReady, collectorLat, collectorLng, targetLat, targetLng, collectorName, targetLabel, distanceMeters, eta.formatted, routePath]);

  return (
    <div className="flex flex-col gap-2 rounded-2xl overflow-hidden border border-blue-500/30 bg-slate-950 text-white shadow-xl relative">
      {/* Top Status Bar */}
      <div className="bg-slate-900/90 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
            <Truck size={16} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-blue-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
              Tracé Bleu & Suivi GPS en direct
            </span>
            <span className="text-[10px] text-slate-300">
              Vitesse calculée à pied (chariot lourd) : <strong>3.0 km/h</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-medium">Distance</span>
            <span className="text-xs font-mono font-extrabold text-amber-400">{distanceMeters} m</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-medium">Temps d'arrivée</span>
            <span className="text-xs font-mono font-extrabold text-emerald-400">{eta.formatted}</span>
          </div>
        </div>
      </div>

      {/* Map Element */}
      <div className="relative w-full overflow-hidden" style={{ height }}>
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Bottom Control Bar if applicable */}
      {showSimulateButton && onAdvanceStep && (
        <div className="bg-slate-900/90 px-3.5 py-2 border-t border-slate-800 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
            <Clock size={13} className="text-amber-400 shrink-0" />
            Simuler le déplacement de l'éboueur vers la maison :
          </span>

          <button
            type="button"
            onClick={onAdvanceStep}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold transition-all shadow active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>🚶‍♂️ Avancer d'un pas (Chariot +8m)</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CartRouteTrackingMap;
