import { useState, useRef, useEffect, useMemo } from 'react';
import * as Location from 'expo-location';
import { haversineDistance } from '@/utils/geo';
import { pois } from '@/constants/pois';
// import { useNearbyPlaces } from '@/apis/useNearbyPlaces';


const POI_UPDATE_DISTANCE_THRESHOLD = 5; // meters

export const usePoiFilter = (
  userLocation: Location.LocationObject | null,
  selectedPoiType: 'police' | 'store' | null
) => {
  const [poiSearchLocation, setPoiSearchLocation] = useState<Location.LocationObject | null>(null);
  const lastPoiSearchLocation = useRef<Location.LocationObject | null>(null);
  // const { places, loading: isSearchingPlaces, searchNearby, clearPlaces } = useNearbyPlaces();
  // 0111 temparirily set up for searching stores with google places API

  // Debounced location for POI searching
  useEffect(() => {
    if (!userLocation) return;

    // Set the initial search location
    if (!lastPoiSearchLocation.current) {
      lastPoiSearchLocation.current = userLocation;
      setPoiSearchLocation(userLocation);
      return;
    }

    // Calculate distance from the last location where we updated the POIs
    const distance = haversineDistance(
      lastPoiSearchLocation.current.coords,
      userLocation.coords
    );

    // If moved more than the threshold, update the location for POI search
    if (distance * 1000 > POI_UPDATE_DISTANCE_THRESHOLD) { // haversineDistance returns km
      console.log(`User moved ${distance * 1000}m, updating POIs.`);
      lastPoiSearchLocation.current = userLocation;
      setPoiSearchLocation(userLocation);
    }
  }, [userLocation]); // Run whenever the user's location changes

  const filteredPois = useMemo(() => {
    if (!selectedPoiType || !poiSearchLocation) {
      return [];
    }
    return pois.filter(poi => {
      if (poi.type !== selectedPoiType) {
        return false;
      }
      const distance = haversineDistance(
        { latitude: poiSearchLocation.coords.latitude, longitude: poiSearchLocation.coords.longitude },
        { latitude: poi.latitude, longitude: poi.longitude }
      );
      return distance <= 2.2;
    });
  }, [poiSearchLocation, selectedPoiType]);

  // if (selectedPoiType !== 'police') return places;
  if (selectedPoiType !== 'police') return [];
  return filteredPois;
};
