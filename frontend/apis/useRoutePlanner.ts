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
    console.log("--- getRoutes started ---");
    if (!GOOGLE_MAPS_API_KEY) {
      setError(new Error('缺少 Google 地圖 API 金鑰。'));
      return;
    }

    const cacheKey = `${origin.latitude.toFixed(5)},${origin.longitude.toFixed(5)}-${destination}`;
    if (routeCache.current.has(cacheKey)) {
      // console.log('Returning route from cache...');
      setRoutes(routeCache.current.get(cacheKey)!);
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination}&mode=walking&key=${GOOGLE_MAPS_API_KEY}&alternatives=true&language=zh-TW`;
      console.log('Fetching routes with URL:', url);
      const response = await fetch(url);
      const data = await response.json();

      try {
        if (data.routes && data.routes.length > 0) {
          const calculatedRoutes = data.routes
            .filter((route: any) => 
              route.legs && 
              route.legs.length > 0 && 
              route.legs[0].distance && 
              route.legs[0].duration &&
              route.overview_polyline && 
              route.overview_polyline.points
            )
            .map((route: any) => {
              const leg = route.legs[0];
              const decodedPolyline = decodePolyline(route.overview_polyline.points);
              const safetyScore = calculateSafetyScore(decodedPolyline, leg.distance.value);
              return {
                distance: leg.distance,
                duration: leg.duration,
                polyline: decodedPolyline,
                encodedPolyline: route.overview_polyline.points,
                safetyScore,
                legs: route.legs,
              };
            });

          if (calculatedRoutes.length > 0) {
            const fastestRoute = [...calculatedRoutes].sort((a, b) => a.duration.value - b.duration.value)[0];
            const shortestRoute = [...calculatedRoutes].sort((a, b) => a.distance.value - b.distance.value)[0];
            const safestRoute = [...calculatedRoutes].sort((a, b) => b.safetyScore - a.safetyScore)[0];

            const uniqueRoutes: RouteInfo[] = [];
            const polylineSet = new Set<string>();

            const addRoute = (route: any, mode: 'fastest' | 'shortest' | 'safest') => {
              if (route && !polylineSet.has(route.encodedPolyline)) {
                uniqueRoutes.push({ ...route, mode });
                polylineSet.add(route.encodedPolyline);
              }
            };

            addRoute(safestRoute, 'safest');
            addRoute(fastestRoute, 'fastest');
            addRoute(shortestRoute, 'shortest');

            routeCache.current.set(cacheKey, uniqueRoutes);
            setRoutes(uniqueRoutes);
          } else {
            setError(new Error('找不到有效的路線。'));
            setRoutes([]);
          }
        } else {
          setError(new Error(data.error_message || '找不到路線。'));
          setRoutes([]); // Clear routes if none are found
        }
        console.log("--- getRoutes processing finished ---");
      } catch (processingError: any) {
        console.error("Error processing routes:", processingError);
        console.error("Original route data:", JSON.stringify(data, null, 2));
        setError(new Error('處理路線時發生錯誤。'));
        setRoutes([]);
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