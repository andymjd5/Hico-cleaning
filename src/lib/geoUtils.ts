// Utility functions for GPS calculations, cart walking speed ETA, and live route interpolation

/**
 * Calculates the geodesic distance in meters between two coordinates using the Haversine formula.
 */
export function getDistanceMeters(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;

  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Calculates Estimated Time of Arrival (ETA) based on pushing a heavy trash cart on foot.
 * Default speed: 3.0 km/h (heavy cart walking speed ~0.833 m/s or ~50 meters/minute).
 */
export function calculateCartETA(
  distanceMeters: number,
  speedKmH: number = 3.0
): { seconds: number; minutes: number; formatted: string; shortFormatted: string } {
  if (distanceMeters <= 8) {
    return {
      seconds: 0,
      minutes: 0,
      formatted: "Arrivé à la parcelle 🏁",
      shortFormatted: "Sur place"
    };
  }

  // Speed in m/s: (3.0 * 1000) / 3600 = 0.83333 m/s
  const speedMS = (speedKmH * 1000) / 3600;
  const totalSeconds = Math.round(distanceMeters / speedMS);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  let formatted = "";
  let shortFormatted = "";

  if (minutes === 0) {
    formatted = `${seconds} sec`;
    shortFormatted = `${seconds}s`;
  } else if (minutes < 60) {
    formatted = `${minutes} min ${seconds < 10 ? '0' : ''}${seconds} sec`;
    shortFormatted = `${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remMins = minutes % 60;
    formatted = `${hours}h ${remMins} min`;
    shortFormatted = `${hours}h${remMins}m`;
  }

  return {
    seconds: totalSeconds,
    minutes,
    formatted,
    shortFormatted
  };
}

/**
 * Calculates an interpolated GPS position towards a target location after advancing a given distance in meters.
 */
export function advancePositionTowardsTarget(
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number,
  stepMeters: number = 8.0
): { latitude: number; longitude: number; arrived: boolean; remainingDistance: number } {
  const currentDist = getDistanceMeters(currentLat, currentLng, targetLat, targetLng);

  if (currentDist <= stepMeters) {
    return {
      latitude: targetLat,
      longitude: targetLng,
      arrived: true,
      remainingDistance: 0
    };
  }

  const fraction = stepMeters / currentDist;
  const newLat = currentLat + (targetLat - currentLat) * fraction;
  const newLng = currentLng + (targetLng - currentLng) * fraction;

  const remaining = getDistanceMeters(newLat, newLng, targetLat, targetLng);

  return {
    latitude: Number(newLat.toFixed(8)),
    longitude: Number(newLng.toFixed(8)),
    arrived: remaining <= 8,
    remainingDistance: remaining
  };
}

/**
 * Fetches real street avenue road route geometry using OSRM foot routing, or falls back to multi-corner street avenues.
 */
export async function fetchStreetRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<[number, number][]> {
  if (Math.abs(startLat - endLat) < 0.00005 && Math.abs(startLng - endLng) < 0.00005) {
    return [[startLat, startLng], [endLat, endLng]];
  }

  // Try OSRM route API (foot routing)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0] && data.routes[0].geometry?.coordinates?.length > 0) {
        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          (pt: [number, number]) => [pt[1], pt[0]]
        );
        if (coords.length > 1) {
          return coords;
        }
      }
    }
  } catch (_) {
    // Fallback if OSRM is unreachable or times out
  }

  // Orthogonal Street Grid Fallback following street axes/avenues instead of direct diagonal
  // Create 3-corner avenue turn path
  const midLng = startLng + (endLng - startLng) * 0.7;
  const midLat = startLat + (endLat - startLat) * 0.85;

  return [
    [startLat, startLng],
    [startLat, midLng],
    [midLat, midLng],
    [midLat, endLng],
    [endLat, endLng]
  ];
}

export interface CollectorMatchResult {
  eboueur: any;
  distanceMeters: number;
  distanceKm: number;
  tier: 'tier1_very_close' | 'tier2_close' | 'tier3_moderate' | 'tier4_far';
  tierLabel: string;
  tierBadgeColor: string;
  isSameCommune: boolean;
  communeMatchLabel: string;
  hasSpace: boolean;
  freeSpace: number;
  activeTaskCount: number;
  score: number;
}

/**
 * Smart Multi-level Collector Dispatching & Ranking Engine.
 * 1. Filter/Prioritize by Same Commune (Limite par Commune)
 * 2. Proximity Distance Tiers:
 *    - Tier 1: Très Proche (<= 1.5 km)
 *    - Tier 2: Proche (1.5 km - 3.5 km)
 *    - Tier 3: Moyennement Proche / Limite (3.5 km - 6.0 km)
 *    - Tier 4: Hors Zone (> 6.0 km)
 * 3. Workload Balance / Queue Optimization across nearby bailleurs.
 */
export function rankAndFilterCollectorsForSignal(
  signalCoords: { lat: number; lng: number },
  signalCommuneId?: string,
  signalCommuneNom?: string,
  eboueurs: any[] = [],
  allSignals: any[] = []
): CollectorMatchResult[] {
  if (!signalCoords || !signalCoords.lat || !signalCoords.lng) return [];

  const targetCommNom = (signalCommuneNom || '').trim().toLowerCase();

  return eboueurs
    .filter(eb => eb.gps_active && eb.latitude != null && eb.longitude != null && !isNaN(eb.latitude) && !isNaN(eb.longitude))
    .map(eb => {
      const distMeters = getDistanceMeters(signalCoords.lat, signalCoords.lng, eb.latitude, eb.longitude);
      const distKm = parseFloat((distMeters / 1000).toFixed(2));

      // Capacity check
      const cap = eb.capacite_camion || 6;
      const load = eb.charge_actuelle || 0;
      const hasSpace = load < cap;
      const freeSpace = Math.max(0, cap - load);

      // Check active assigned tasks for load balancing across dense bailleur requests
      const activeTaskCount = allSignals.filter(
        s => (s.status === 'assigned' || s.status === 'pending') &&
             (s.assigned_eboueur_id === eb.id || (s as any).eboueur_id === eb.id)
      ).length;

      // Check Commune Match
      const ebZoneNom = (eb.zone_nom || eb.commune_nom || eb.commune || '').trim().toLowerCase();
      const isSameCommune = Boolean(
        (signalCommuneId && (eb.zone_id === signalCommuneId || eb.commune_id === signalCommuneId)) ||
        (targetCommNom && ebZoneNom && (ebZoneNom.includes(targetCommNom) || targetCommNom.includes(ebZoneNom)))
      );

      const communeMatchLabel = isSameCommune
        ? `Même commune (${signalCommuneNom || 'Zone locale'})`
        : `Commune voisine (${eb.zone_nom || eb.commune_nom || 'Zone distante'})`;

      // 3-Level Proximity Tier Assignment
      let tier: 'tier1_very_close' | 'tier2_close' | 'tier3_moderate' | 'tier4_far' = 'tier4_far';
      let tierLabel = 'Moyennement proche';
      let tierBadgeColor = 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      let tierBonus = 0;

      if (distMeters <= 1500) {
        tier = 'tier1_very_close';
        tierLabel = 'Très proche (<= 1.5 km)';
        tierBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
        tierBonus = 4000;
      } else if (distMeters <= 3500) {
        tier = 'tier2_close';
        tierLabel = 'Proche (1.5 km - 3.5 km)';
        tierBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
        tierBonus = 2500;
      } else if (distMeters <= 6000) {
        tier = 'tier3_moderate';
        tierLabel = 'Moyennement proche (3.5 km - 6.0 km)';
        tierBadgeColor = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
        tierBonus = 1000;
      } else {
        tier = 'tier4_far';
        tierLabel = 'Hors zone recommandée (> 6.0 km)';
        tierBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
        tierBonus = -2000;
      }

      // Calculate composite priority score
      // 1. Capacity space: +10,000 points
      // 2. Same commune match: +5,000 points
      // 3. Proximity Tier bonus: +4000 / +2500 / +1000
      // 4. Load balancing penalty: -300 points per active assigned task (so dense requests spread out)
      // 5. Distance penalty: -1 point per 10 meters
      let score = 0;
      if (hasSpace) score += 10000;
      if (isSameCommune) score += 5000;
      score += tierBonus;
      score -= (activeTaskCount * 300);
      score -= Math.round(distMeters / 10);

      return {
        eboueur: eb,
        distanceMeters: distMeters,
        distanceKm: distKm,
        tier,
        tierLabel,
        tierBadgeColor,
        isSameCommune,
        communeMatchLabel,
        hasSpace,
        freeSpace,
        activeTaskCount,
        score
      };
    })
    .sort((a, b) => b.score - a.score);
}


