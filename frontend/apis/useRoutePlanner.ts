import { useState, useRef } from 'react';
import Constants from 'expo-constants';
import { decodePolyline } from '../utils/polyline';
import { calculateSafetyScore } from '../utils/safetyScore';
import { RouteInfo } from '../types';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;

export const useRoutePlanner = () => {
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const routeCache = useRef(new Map<string, RouteInfo[]>());

  const getRoutes = async (origin: { latitude: number; longitude: number }, destination: string) => {
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
    setError(null); // Clear previous errors
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}&alternatives=true&language=zh-TW`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const calculatedRoutes = data.routes.map((route: any) => {
          const leg = route.legs[0];
          const decodedPolyline = decodePolyline(route.overview_polyline.points);
          const safetyScore = calculateSafetyScore(decodedPolyline, leg.distance.value);
          return {
            distance: leg.distance,
            duration: leg.duration,
            polyline: route.overview_polyline.points,
            safetyScore,
            legs: route.legs,
          };
        });

        const fastestRoute = [...calculatedRoutes].sort((a, b) => a.duration.value - b.duration.value)[0];
        const shortestRoute = [...calculatedRoutes].sort((a, b) => a.distance.value - b.distance.value)[0];
        const safestRoute = [...calculatedRoutes].sort((a, b) => b.safetyScore - a.safetyScore)[0];

        const uniqueRoutes: RouteInfo[] = [];
        const polylineSet = new Set<string>();

        const addRoute = (route: any, mode: 'fastest' | 'shortest' | 'safest') => {
          if (route && !polylineSet.has(route.polyline)) {
            uniqueRoutes.push({ ...route, mode });
            polylineSet.add(route.polyline);
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
        setRoutes([]); // Clear routes if none are found
      }
    } catch (e: any) {
      setError(new Error('無法獲取路線。'));
      setRoutes([]); // Clear routes on error
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
