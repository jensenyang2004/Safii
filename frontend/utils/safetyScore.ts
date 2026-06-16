import { PlaceInfo } from '../types';
import { pois } from '../constants/pois';

const haversineDistance = (
  coords1: { latitude: number; longitude: number },
  coords2: { latitude: number; longitude: number }
) => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const calculateSafetyScore = (
  polyline: { latitude: number; longitude: number }[],
  routeLength: number,
  destinationPoiId: string | null, // destinationPoiId is not used in this version but kept for signature consistency
  dynamicPois: PlaceInfo[]
): number => {
  let poiScore = 0;
  const poiRadius = 0.2; // 200 meters
  const CONVENIENCE_STORE_WEIGHT = 0.5;

  // 1. Score from dynamically fetched convenience stores
  // These are known to be along the route from the fetchPoisAlongRoute sampling
  for (const poi of dynamicPois) {
    const poiLocation = poi.geometry.location;
    // Double-check if this POI is near any point on the polyline to be sure
    const isNearRoute = polyline.some(point => 
      haversineDistance(point, { latitude: poiLocation.lat, longitude: poiLocation.lng }) <= poiRadius
    );
    if (isNearRoute) {
      poiScore += CONVENIENCE_STORE_WEIGHT;
    }
  }

  // 2. Score from static police stations list
  // Filter for police stations from the local constants
  const policePois = pois.filter(p => p.type === 'police');
  for (const poi of policePois) {
    // Check if this police station is near any point on the polyline
    const isNearRoute = polyline.some(point => 
      haversineDistance(point, { latitude: poi.latitude, longitude: poi.longitude }) <= poiRadius
    );
    if (isNearRoute) {
      poiScore += poi.weight; // Use the weight from the constant (1.0)
    }
  }

  // A simple normalization and penalty logic.
  // This can be tweaked for better scoring balance.
  const lengthPenalty = routeLength / 1000; // Penalty for longer routes
  // The scaling factor (e.g., 10) can be adjusted to balance the impact of POIs vs. length
  const finalScore = poiScore * 10 - lengthPenalty * 5;

  return Math.max(0, Math.min(100, Math.round(finalScore)));
};
