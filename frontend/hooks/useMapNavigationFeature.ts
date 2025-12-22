import { useState, useRef, useEffect } from 'react';
import { RouteInfo, POI } from '@/types';
import * as Location from 'expo-location';
import { useRoutePlanner } from '@/apis/useRoutePlanner';
import { useLiveNavigation } from '@/hooks/useLiveNavigation';

interface UseMapNavigationFeatureProps {
  location: Location.LocationObject | null;
  setCalloutVisible: (visible: string | null) => void;
  setSelectedPoiType: (type: 'police' | 'store' | null) => void;
  setSelectedPoliceStation: (station: any) => void;
  setSelectedLocation: (location: any) => void;
}

export const useMapNavigationFeature = ({
  location,
  setCalloutVisible,
  setSelectedPoiType,
  setSelectedPoliceStation,
  setSelectedLocation,
}: UseMapNavigationFeatureProps) => {
  const { routes, error: routeError, getRoutes, loading: isFetchingRoutes, clearRoutes } = useRoutePlanner();
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const lastRecalculation = useRef<number>(0);
  const [destinationInfo, setDestinationInfo] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showDestinationCard, setShowDestinationCard] = useState(false);
  const [destinationMarker, setDestinationMarker] = useState<{ latitude: number, longitude: number, name: string } | null>(null);
  const [pendingAutoNavigateTo, setPendingAutoNavigateTo] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleReroute = async (newOrigin: Location.LocationObject) => {
    if (destination) {
      console.log("Rerouting from new origin:", newOrigin.coords);
      await getRoutes(newOrigin.coords, destination);
    }
  };

  const {
    isNavigating,
    userLocation: navUserLocation,
    traveledPath,
    remainingPath,
    startNavigation,
    stopNavigation,
    updateRoute,
    currentStep,
    remainingDistance,
    eta,
  } = useLiveNavigation({ onReroute: handleReroute });

  const handleStartNavigation = (route: RouteInfo) => {
    if (location) {
      console.log("--- Starting Real Navigation ---");
      startNavigation(route);
      // Clean up UI
      setSelectedPoiType(null);
      setCalloutVisible(null);
      setDestinationInfo(null);
      setShowDestinationCard(false);
    }
  };

  const handleCancelRouteSelection = () => {
    setDestination(null);
    setSelectedRoute(null);
    setSelectedPoliceStation(null);
    setSelectedLocation(null);
    setDestinationMarker(null);
    setCalloutVisible(null);
    clearRoutes();
    setDestinationInfo(null);
    setShowDestinationCard(false);
  };

  const handleNavigateToPoliceStation = (selectedStation: any) => {
    if (!selectedStation || !location) return;

    const destinationString = `${selectedStation.latitude},${selectedStation.longitude}`;
    setDestination(destinationString);
    getRoutes(location.coords, destinationString);

    setDestinationMarker({
      latitude: selectedStation.latitude,
      longitude: selectedStation.longitude,
      name: selectedStation.name,
    });
    setSelectedPoliceStation(null);
    setCalloutVisible(null);
  };

  const handleNavigateToLocation = (selectedLoc: any) => {
    if (!destinationInfo || !location) return;

    console.log("Planning route to:", destinationInfo.name);
    const destinationString = `${destinationInfo.latitude},${destinationInfo.longitude}`;
    setDestination(destinationString);
    getRoutes(location.coords, destinationString);
    setDestinationMarker({
      latitude: selectedLoc.latitude,
      longitude: selectedLoc.longitude,
      name: selectedLoc.name,
    });
    setSelectedLocation(null);
  };

  const handleSearch = (query: string, latitude?: number, longitude?: number) => {
    if (location) {
      setDestinationMarker(null);
      setSelectedLocation(null);
      setDestination(query);

      if (latitude !== undefined && longitude !== undefined) {
        getRoutes(location.coords, `${latitude},${longitude}`);
      } else {
        getRoutes(location.coords, query);
      }
      lastRecalculation.current = Date.now();
    }
  };

  const handleSuggestionSelected = (description: string, latitude: number, longitude: number, mapRef: React.RefObject<any>) => {
    const locationData = {
      name: description.split(',')[0],
      address: description,
      latitude: latitude,
      longitude: longitude
    };
    console.log('handleSuggestionSelected called with:', { description, latitude, longitude });
    setSelectedLocation(locationData);
    setDestinationMarker(locationData);
    setDestinationInfo(locationData);
    setShowDestinationCard(true);

    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: latitude,
        longitude: longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  // Auto-selection and auto-start logic
  useEffect(() => {
    if (routes.length > 0) {
      const newSelectedRoute = routes.find(r => r.mode === 'safest') || routes[0];
      setSelectedRoute(newSelectedRoute);

      console.log("Auto-selected route:", newSelectedRoute.mode);
      if (isNavigating) {
        updateRoute(newSelectedRoute);
      }

      if (pendingAutoNavigateTo && !isNavigating && location) {
        console.log('Auto-starting navigation to pending destination');
        handleStartNavigation(newSelectedRoute);
        setPendingAutoNavigateTo(null);
      }
    }
  }, [routes, pendingAutoNavigateTo, isNavigating, location]);

  // Periodic recalculation
  useEffect(() => {
    if (destination && location && !isNavigating) {
      const now = Date.now();
      if (now - lastRecalculation.current > 10000) {
        getRoutes(location.coords, destination);
        lastRecalculation.current = now;
      }
    }
  }, [location, isNavigating]);

  return {
    routes,
    routeError,
    isFetchingRoutes,
    selectedRoute,
    destination,
    destinationInfo,
    showDestinationCard,
    destinationMarker,
    isNavigating,
    navUserLocation,
    traveledPath,
    remainingPath,
    currentStep,
    remainingDistance,
    eta,
    setSelectedRoute,
    setDestination,
    setDestinationInfo,
    setShowDestinationCard,
    setDestinationMarker,
    setPendingAutoNavigateTo,
    handleStartNavigation,
    stopNavigation,
    handleCancelRouteSelection,
    handleNavigateToPoliceStation,
    handleNavigateToLocation,
    handleSearch,
    handleSuggestionSelected,
  };
};
