import { point, lineString, length } from '@turf/helpers';
import { getCoord } from '@turf/invariant';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import turfLength from '@turf/length';

export interface Point {
  latitude: number;
  longitude: number;
}

export const findNearestPointOnPolyline = (point: Point, polyline: Point[]) => {
  const pt = [point.longitude, point.latitude];
  const line = polyline.map(p => [p.longitude, p.latitude]);
  const nearestPoint = nearestPointOnLine(lineString(line), pt, { units: 'meters' });
  return {
    latitude: nearestPoint.geometry.coordinates[1],
    longitude: nearestPoint.geometry.coordinates[0],
    index: nearestPoint.properties.index,
    distance: nearestPoint.properties.dist,
  };
};

export const calculateProgress = (pointIndex: number, polyline: Point[]) => {
  const line = polyline.slice(0, pointIndex + 1);
  if (line.length < 2) {
    return 0;
  }
  const progress = turfLength(lineString(line.map(p => [p.longitude, p.latitude])), { units: 'meters' });
  return progress;
};

// Haversine formula for distance between two points
export function getDistance(p1: Point, p2: Point) {
  const R = 6371e3; // metres
  const φ1 = p1.latitude * Math.PI / 180; // φ, λ in radians
  const φ2 = p2.latitude * Math.PI / 180;
  const Δφ = (p2.latitude - p1.latitude) * Math.PI / 180;
  const Δλ = (p2.longitude - p1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
}