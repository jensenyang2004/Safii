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
  routeLength: number
): number => {
  let poiScore = 0;
  const poiRadius = 0.2; // 200 meters

  for (const point of polyline) {
    for (const poi of pois) {
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
