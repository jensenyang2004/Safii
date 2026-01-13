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
  const requestCounter = useRef(0); // Add a request counter

  const getRoutes = async (origin: { latitude: number; longitude: number }, destination: string, destinationPoiId: string | null = null) => {
    const currentRequestId = ++requestCounter.current; // Increment and get current request ID

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

      // If the request is no longer the latest, discard the result
      if (currentRequestId !== requestCounter.current) {
        console.log('Discarding outdated route request.');
        return;
      }

      if (data.routes && data.routes.length > 0) {
        
        const calculatedRoutesPromises = data.routes.map(async (route: any) => {
          const leg = route.legs[0];
          const decodedPolyline = decodePolyline(route.overview_polyline.points);
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

        // If the request is no longer the latest after the long async operations, discard the result
        if (currentRequestId !== requestCounter.current) {
          console.log('Discarding outdated route request after processing.');
          return;
        }

        const fastestRoute = [...calculatedRoutes].sort((a, b) => a.duration.value - b.duration.value)[0];
        const shortestRoute = [...calculatedRoutes].sort((a, b) => a.distance.value - b.distance.value)[0];
        const safestRoute = [...calculatedRoutes].sort((a, b) => b.safetyScore - a.safetyScore)[0];

        const uniqueRoutes: RouteInfo[] = [];
        const polylineSet = new Set<string>();

        const addRoute = (route: any, mode: 'fastest' | 'shortest' | 'safest') => {
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
      // Only stop loading if this is the latest request
      if (currentRequestId === requestCounter.current) {
        setLoading(false);
      }
    }
  };

  const clearRoutes = () => {
    requestCounter.current++; // Invalidate any ongoing requests
    setRoutes([]);
    setError(null);
    setLoading(false);
    routeCache.current.clear();
  };

  return { routes, error, getRoutes, loading, clearRoutes };
};
