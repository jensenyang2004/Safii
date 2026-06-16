
import { useEffect, useState, useMemo } from 'react';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { initDatabase, findClosestCache, insertCache, CacheResult } from '@/libs/database';
import { haversineDistance } from '@/utils/geo';
import { pois } from '@/constants/pois';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;

export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'police' | 'store';
}

export const usePlaces = (
    userLocation: Location.LocationObject | null,
    selectedPoiTypes: ('police' | 'store')[]
) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase().catch(err => console.error("Database initialization failed:", err));
  }, []);

  const searchNearbyStores = async (location: { latitude: number; longitude: number }, keyword: string, radius: number = 1000) => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Missing Google Maps API Key.');
      return [];
    }
    if (!keyword || keyword.trim() === '') {
      setError('Search keyword cannot be empty.');
      return [];
    }

    const CACHE_INVALIDATION_DISTANCE_KM = 0.5; // 500 meters

    try {
      const cachedEntry: CacheResult | null = await findClosestCache(
        location.latitude,
        location.longitude,
        keyword,
        CACHE_INVALIDATION_DISTANCE_KM
      );

      if (cachedEntry) {
        console.log('Returning nearby places from SQLite spatial cache.');
        const cachedPlaces = JSON.parse(cachedEntry.results);
        return cachedPlaces.map((p: any) => ({
            id: p.place_id,
            name: p.name,
            address: p.vicinity,
            latitude: p.geometry.location.lat,
            longitude: p.geometry.location.lng,
            type: 'store'
        }));
      }
    } catch (err) {
      console.error("Failed to fetch from spatial cache:", err);
    }

    setLoading(true);
    setError(null);

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${GOOGLE_MAPS_API_KEY}&language=zh-TW`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        const cacheKey = `${location.latitude.toFixed(5)}_${location.longitude.toFixed(5)}_${keyword}`;
        insertCache(cacheKey, JSON.stringify(data.results), location, keyword).catch(err => console.error("Failed to insert into cache:", err));
        return data.results.map((p: any) => ({
            id: p.place_id,
            name: p.name,
            address: p.vicinity,
            latitude: p.geometry.location.lat,
            longitude: p.geometry.location.lng,
            type: 'store'
        }));
      } else {
        console.error('Google Places API Error:', data.error_message || data.status);
        setError(data.error_message || `Google API Error: ${data.status}`);
      }
    } catch (e: any) {
      console.error('Failed to fetch nearby places:', e);
      setError('Failed to fetch nearby places. Please check your connection.');
    } finally {
      setLoading(false);
    }
    return [];
  };

  const staticPoliceStations = useMemo(() => {
    if (!userLocation) {
        return [];
    }
    return pois
        .filter(poi => poi.type === 'police')
        .map(poi => ({
            id: poi.id,
            name: poi.name,
            address: poi.address,
            latitude: poi.latitude,
            longitude: poi.longitude,
            type: 'police'
        }));
  }, [userLocation]);


  useEffect(() => {
    const fetchPlaces = async () => {
        if (!userLocation) return;

        let allPlaces: Place[] = [];

        if (selectedPoiTypes.includes('police')) {
            allPlaces = allPlaces.concat(staticPoliceStations);
        }

        if (selectedPoiTypes.includes('store')) {
            const storePlaces = await searchNearbyStores(userLocation.coords, "超商");
            allPlaces = allPlaces.concat(storePlaces);
        }

        setPlaces(allPlaces);
    };

    fetchPlaces();
  }, [userLocation, selectedPoiTypes, staticPoliceStations]);

  return { places, loading, error };
};
