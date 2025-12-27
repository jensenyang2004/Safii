import { POI, HeatmapCell } from '../types';
import { pois } from '../constants/pois';

const heatmap: HeatmapCell[] = []; // Assuming no heatmap data for now

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
  destinationPoiId: string | null
): number => {
  let poiScore = 0;
  const poiRadius = 0.2; // 200 meters

  // Pre-filter the POIs to exclude the destination, if a destination POI ID is provided.
  const poisToCheck = destinationPoiId
    ? pois.filter(p => p.id !== destinationPoiId)
    : pois;

  for (const point of polyline) {
    for (const poi of poisToCheck) {
      const distance = haversineDistance(point, { latitude: poi.latitude, longitude: poi.longitude });
      if (distance <= poiRadius) {
        poiScore += poi.weight;
      }
    }
  }

  const normalizedPoiScore = poiScore / (polyline.length || 1);
  const lengthPenalty = routeLength / 1000; // Penalty for longer routes
  const finalScore = normalizedPoiScore * 50 - lengthPenalty * 10;

  return Math.max(0, Math.min(100, Math.round(finalScore)));
};
