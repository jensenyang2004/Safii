import { useState, useRef } from 'react';
import Constants from 'expo-constants';
import { decodePolyline } from '../utils/polyline';
import { calculateSafetyScore } from '../utils/safetyScore';
import { RouteInfo, PlaceInfo } from '../types';
import { haversineDistance } from '@/utils/geo';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;

// Helper function to fetch POIs along the route using segmentation
const fetchPoisAlongRoute = async (polyline: { latitude: number; longitude: number }[]): Promise<PlaceInfo[]> => {
  if (polyline.length === 0) {
    return [];
  }

  const SAMPLING_DISTANCE_METERS = 5000; // 5km
  const SEARCH_RADIUS_METERS = 3000; // 3km search radius for each sample point
  const allPois = new Map<string, PlaceInfo>();
  const samplePoints: { latitude: number; longitude: number }[] = [polyline[0]];
  
  let distanceTraveled = 0;
  let lastSampledPoint = polyline[0];

  for (let i = 1; i < polyline.length; i++) {
    const currentPoint = polyline[i];
    distanceTraveled += haversineDistance(lastSampledPoint, currentPoint) * 1000; // convert km to meters

    if (distanceTraveled >= SAMPLING_DISTANCE_METERS) {
      samplePoints.push(currentPoint);
      lastSampledPoint = currentPoint;
      distanceTraveled = 0;
    }
  }
  // Also include the last point if it's far enough from the last sample
  if (polyline.length > 1) {
    const lastPoint = polyline[polyline.length - 1];
    if (haversineDistance(lastSampledPoint, lastPoint) * 1000 > SEARCH_RADIUS_METERS) {
        samplePoints.push(lastPoint);
    }
  }


  const fetchPromises = samplePoints.map(point => {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${point.latitude},${point.longitude}&radius=${SEARCH_RADIUS_METERS}&keyword=超商&key=${GOOGLE_MAPS_API_KEY}&language=zh-TW`;
    return fetch(url).then(res => res.json());
  });

  try {
    const responses = await Promise.all(fetchPromises);
    for (const data of responses) {
      if (data.status === 'OK' && data.results) {
        for (const result of data.results) {
          if (!allPois.has(result.place_id)) {
            allPois.set(result.place_id, result);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error fetching POIs along route:", error);
  }

  return Array.from(allPois.values());
};


export const useRoutePlanner = () => {
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const routeCache = useRef(new Map<string, RouteInfo[]>());

  const getRoutes = async (origin: { latitude: number; longitude: number }, destination: string, destinationPoiId: string | null = null) => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError(new Error('缺少 Google 地圖 API 金鑰。'));
      return;
    }

    const cacheKey = `${origin.latitude.toFixed(5)},${origin.longitude.toFixed(5)}-${destination}`;
    if (routeCache.current.has(cacheKey)) {
      console.log('Returning route from cache...');
      setRoutes(routeCache.current.get(cacheKey)!);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination}&mode=walking&key=${GOOGLE_MAPS_API_KEY}&alternatives=true&language=zh-TW`;
      console.log('Fetching routes with URL:', url);
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        
        // Process routes one by one to fetch dynamic POIs for each
        const calculatedRoutesPromises = data.routes.map(async (route: any) => {
          const leg = route.legs[0];
          const decodedPolyline = decodePolyline(route.overview_polyline.points);

          // Fetch dynamic POIs for this specific route
          const dynamicPois = await fetchPoisAlongRoute(decodedPolyline);

          const safetyScore = calculateSafetyScore(decodedPolyline, leg.distance.value, destinationPoiId, dynamicPois);
          
          return {
            distance: leg.distance,
            duration: leg.duration,
            polyline: decodedPolyline,
            safetyScore,
            legs: route.legs,
          };
        });

        const calculatedRoutes = await Promise.all(calculatedRoutesPromises);

        const fastestRoute = [...calculatedRoutes].sort((a, b) => a.duration.value - b.duration.value)[0];
        const shortestRoute = [...calculatedRoutes].sort((a, b) => a.distance.value - b.distance.value)[0];
        const safestRoute = [...calculatedRoutes].sort((a, b) => b.safetyScore - a.safetyScore)[0];

        const uniqueRoutes: RouteInfo[] = [];
        const polylineSet = new Set<string>();

        const addRoute = (route: any, mode: 'fastest' | 'shortest' | 'safest') => {
          // The polyline object itself is an array of objects, cannot be used in Set directly.
          // A quick solution is to stringify it, but a better one would be a unique ID if available.
          // For now, we assume the polyline array can be uniquely identified by its content.
          const polylineKey = JSON.stringify(route.polyline);
          if (route && !polylineSet.has(polylineKey)) {
            uniqueRoutes.push({ ...route, mode });
            polylineSet.add(polylineKey);
          }
        };

        addRoute(safestRoute, 'safest');
        addRoute(fastestRoute, 'fastest');
        addRoute(shortestRoute, 'shortest');

        console.log('Caching new route...');
        routeCache.current.set(cacheKey, uniqueRoutes);
        setRoutes(uniqueRoutes);
      } else {
        setError(new Error(data.error_message || '找不到路線。'));
        setRoutes([]);
      }
    } catch (e: any) {
      setError(new Error('無法獲取路線。'));
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const clearRoutes = () => {
    setRoutes([]);
    setError(null);
    setLoading(false);
  };

  return { routes, error, getRoutes, loading, clearRoutes };
};