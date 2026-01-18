// frontend/apis/useNearbyPlaces.ts

import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { initDatabase, findClosestCache, insertCache, CacheResult } from '@/libs/database';
import { haversineDistance } from '@/utils/geo';

// Get the API key from Expo constants, same as in useRoutePlanner
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;

// Define a type for the place information we want to store
export interface PlaceInfo {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now: boolean;
  };
  photos?: {
    photo_reference: string;
  }[];
}

export const useNearbyPlaces = (
  selectedPoiType: 'police' | 'store' | null
) => {
  const [places, setPlaces] = useState<PlaceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the database when the hook is first used
  useEffect(() => {
    initDatabase().catch(err => console.error("Database initialization failed:", err));
  }, []);

  /**
   * Searches for places near a given location based on a keyword.
   * @param location The user's current location { latitude, longitude }.
   * @param keyword The search term (e.g., "coffee shop", "atm").
   * @param radius The search radius in meters. Defaults to 1000.
   */
  const searchNearby = async (location: { latitude: number; longitude: number }, keyword: string, radius: number = 1000) => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Missing Google Maps API Key.');
      return;
    }
    if (!keyword || keyword.trim() === '') {
      setError('Search keyword cannot be empty.');
      return;
    }

    const CACHE_INVALIDATION_DISTANCE_KM = 0.5; // 500 meters

    try {
      // Use the new findClosestCache function
      const cachedEntry: CacheResult | null = await findClosestCache(
        location.latitude,
        location.longitude,
        keyword,
        CACHE_INVALIDATION_DISTANCE_KM
      );

      if (cachedEntry) {
        console.log('Returning nearby places from SQLite spatial cache.');
        setPlaces(JSON.parse(cachedEntry.results));
        return;
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
        setPlaces(data.results);
        // Store result in cache using the updated insertCache signature
        // Generate a simple cache_key for insertCache, as findClosestCache handles spatial lookup
        const cacheKey = `${location.latitude.toFixed(5)}_${location.longitude.toFixed(5)}_${keyword}`;
        insertCache(cacheKey, JSON.stringify(data.results), location, keyword).catch(err => console.error("Failed to insert into cache:", err));
      } else {
        // Handle Google API errors (e.g., ZERO_RESULTS, INVALID_REQUEST)
        console.error('Google Places API Error:', data.error_message || data.status);
        setError(data.error_message || `Google API Error: ${data.status}`);
        setPlaces([]);
      }
    } catch (e: any) {
      console.error('Failed to fetch nearby places:', e);
      setError('Failed to fetch nearby places. Please check your connection.');
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const clearPlaces = () => {
    setPlaces([]);
    setError(null);
  };
  
  useEffect(() => {
    if (selectedPoiType === 'police') {
       setPlaces([]); // ✅ 正確：包在 useEffect 裡
    }
  }, [selectedPoiType]);
  return { places, loading, error, searchNearby, clearPlaces };
};