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

