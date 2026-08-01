import React, { useEffect, useRef, useState } from 'react';
import { getDistanceMeters, calculateCartETA, fetchStreetRoute } from '../lib/geoUtils';
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
  hasMission?: boolean;
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
  showSimulateButton = false,
  hasMission = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  // Compute live metrics (cart walking speed = 3.0 km/h)
  const distanceMeters = getDistanceMeters(collectorLat, collectorLng, targetLat, targetLng);
  const eta = calculateCartETA(distanceMeters, 3.0);

  // Fetch real road route geometry following real street avenues
  useEffect(() => {
    if (!hasMission) return;
    let isMounted = true;
    fetchStreetRoute(collectorLat, collectorLng, targetLat, targetLng).then((coords) => {
      if (isMounted) {
        setRoutePath(coords);
      }
    });
    return () => { isMounted = false; };
  }, [collectorLat, collectorLng, targetLat, targetLng, hasMission]);

  // Initialize Leaflet Map
  useEffect(() => {
    let intervalId: any;

    const initMap = () => {
      if (!window.L || !mapContainerRef.current) return false;
      if (mapRef.current) return true;

      try {
        const centerLat = hasMission ? (collectorLat + targetLat) / 2 : (collectorLat || -4.3250);
        const centerLng = hasMission ? (collectorLng + targetLng) / 2 : (collectorLng || 15.3100);
        const initialZoom = hasMission ? 15 : 12;

        const map = window.L.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: initialZoom,
          zoomControl: true,
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

    // Helper to calculate dynamic sizing based on zoom level so elements fit within street width
    const getZoomScaleParams = (zoom: number) => {
      if (zoom >= 18) {
        return {
          iconPx: 20,
          fontSizePx: 10,
          pingSize: 'h-5 w-5',
          strokeWeight: 3,
          dashArray: '4, 4'
        };
      } else if (zoom === 17) {
        return {
          iconPx: 24,
          fontSizePx: 12,
          pingSize: 'h-6 w-6',
          strokeWeight: 4,
          dashArray: '6, 6'
        };
      } else {
        return {
          iconPx: 32,
          fontSizePx: 14,
          pingSize: 'h-8 w-8',
          strokeWeight: 5,
          dashArray: '8, 8'
        };
      }
    };

    const currentZoom = map.getZoom() || 15;
    const scale = getZoomScaleParams(currentZoom);

    // 1. Collector Marker 🚚
    const collectorIcon = window.L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex ${scale.pingSize} rounded-full bg-blue-500/40 animate-ping"></span>
          <div class="relative rounded-full bg-blue-600 text-white border-2 border-white shadow-lg flex items-center justify-center font-bold" style="width: ${scale.iconPx}px; height: ${scale.iconPx}px; font-size: ${scale.fontSizePx}px;">
            🚚
          </div>
        </div>
      `,
      iconSize: [scale.iconPx, scale.iconPx],
      iconAnchor: [scale.iconPx / 2, scale.iconPx / 2]
    });

    const collectorMarker = window.L.marker([collectorLat, collectorLng], { icon: collectorIcon });
    collectorMarker.bindPopup(`<b>Éboueur: ${collectorName}</b><br/>Position en temps réel`);
    collectorMarker.addTo(group);

    if (!hasMission) {
      // General view without mission restriction
      try {
        map.setMaxBounds(null);
        map.setMinZoom(1);
        map.setView([collectorLat || -4.3250, collectorLng || 15.3100], 12);
      } catch (_) {}
      return;
    }

    // 2. Target House Marker 🏠
    const houseIcon = window.L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="rounded-full bg-amber-500 text-white border-2 border-white shadow-lg flex items-center justify-center font-bold" style="width: ${scale.iconPx}px; height: ${scale.iconPx}px; font-size: ${scale.fontSizePx}px;">
            🏠
          </div>
        </div>
      `,
      iconSize: [scale.iconPx, scale.iconPx],
      iconAnchor: [scale.iconPx / 2, scale.iconPx / 2]
    });

    const houseMarker = window.L.marker([targetLat, targetLng], { icon: houseIcon });
    houseMarker.bindPopup(`<b>Destination: ${targetLabel}</b>`);
    houseMarker.addTo(group);

    // 3. Draw Blue Route Line following real avenues (Tracé en bleu)
    const lineCoords = routePath.length > 0 
      ? routePath 
      : [[collectorLat, collectorLng], [collectorLat, targetLng], [targetLat, targetLng]];

    const routePolyline = window.L.polyline(
      lineCoords,
      {
        color: '#2563eb', // Vivid Blue
        weight: scale.strokeWeight,
        opacity: 0.9,
        dashArray: scale.dashArray,
        lineCap: 'round'
      }
    ).addTo(group);

    // Attach zoomend listener to dynamically resize elements when zooming in or out
    const handleZoomChange = () => {
      const newZoom = map.getZoom();
      const newScale = getZoomScaleParams(newZoom);

      routePolyline.setStyle({
        weight: newScale.strokeWeight,
        dashArray: newScale.dashArray
      });

      const updatedCollectorIcon = window.L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex ${newScale.pingSize} rounded-full bg-blue-500/40 animate-ping"></span>
            <div class="relative rounded-full bg-blue-600 text-white border-2 border-white shadow-lg flex items-center justify-center font-bold" style="width: ${newScale.iconPx}px; height: ${newScale.iconPx}px; font-size: ${newScale.fontSizePx}px;">
              🚚
            </div>
          </div>
        `,
        iconSize: [newScale.iconPx, newScale.iconPx],
        iconAnchor: [newScale.iconPx / 2, newScale.iconPx / 2]
      });
      collectorMarker.setIcon(updatedCollectorIcon);

      const updatedHouseIcon = window.L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="rounded-full bg-amber-500 text-white border-2 border-white shadow-lg flex items-center justify-center font-bold" style="width: ${newScale.iconPx}px; height: ${newScale.iconPx}px; font-size: ${newScale.fontSizePx}px;">
              🏠
            </div>
          </div>
        `,
        iconSize: [newScale.iconPx, newScale.iconPx],
        iconAnchor: [newScale.iconPx / 2, newScale.iconPx / 2]
      });
      houseMarker.setIcon(updatedHouseIcon);
    };

    map.on('zoomend', handleZoomChange);

    // Fit map bounds smoothly and apply strict bounded mission zone calibration
    try {
      const bounds = window.L.latLngBounds(lineCoords);
      const paddedBounds = bounds.pad(0.35); // 35% margin around mission path
      
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      
      // Strict Bounded Zone Calibration (No zooming out or dragging outside mission area)
      map.setMaxBounds(paddedBounds);
      
      const boundsZoom = map.getBoundsZoom(paddedBounds, false);
      const calculatedMinZoom = Math.max(14, boundsZoom - 1);
      map.setMinZoom(calculatedMinZoom);
    } catch (_) {}

    return () => {
      map.off('zoomend', handleZoomChange);
    };
  }, [isReady, collectorLat, collectorLng, targetLat, targetLng, collectorName, targetLabel, distanceMeters, eta.formatted, routePath, hasMission]);

  return (
    <div className="flex flex-col gap-2 rounded-2xl overflow-hidden border border-blue-500/30 bg-slate-950 text-white shadow-xl relative">
      {/* Top Status Bar */}
      <div className="bg-slate-900/90 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg shrink-0 border border-blue-500/30">
            <Truck size={16} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-blue-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <span>{hasMission ? "Tracé Bleu & Suivi GPS en direct" : "Carte Générale Kinshasa - Toutes Communes"}</span>
              {hasMission && (
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold flex items-center gap-1">
                  🔒 Zone Restreinte Calibrée
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-300">
              {hasMission ? (
                <>Vitesse calculée à pied (chariot lourd) : <strong>3.0 km/h</strong></>
              ) : (
                <>Vue d'ensemble de la ville sans restriction de zoom</>
              )}
            </span>
          </div>
        </div>

        {hasMission ? (
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
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              En attente de mission
            </span>
          </div>
        )}
      </div>

      {/* Map Element */}
      <div className="relative w-full overflow-hidden" style={{ height }}>
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Bottom Control Bar if applicable */}
      {hasMission && showSimulateButton && onAdvanceStep && (
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
