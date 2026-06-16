import { useState, useRef, useEffect } from 'react';
import { RouteInfo, POI } from '@/types';
import * as Location from 'expo-location';
import { useLiveNavigation } from '@/hooks/useLiveNavigation';

interface UseMapNavigationFeatureProps {
  location: Location.LocationObject | null;
  selectedPoiType: 'police' | 'store' | null;
  setCalloutVisible: (visible: string | null) => void;
  setSelectedPoiType: (type: 'police' | 'store' | null) => void;
  setSelectedLocation: (location: any) => void;
  setShowLocationCard: (show: boolean) => void;
  setSelectedLocationInfo: (info: any) => void;
  routes: RouteInfo[];
  getRoutes: (origin: { latitude: number; longitude: number }, destination: string, destinationPoiId?: string | null) => Promise<void>;
  clearRoutes: () => void;
  isFetchingRoutes: boolean;
  routeError: Error | null;
  searchNearby: (location: { latitude: number; longitude: number }, keyword: string) => Promise<void>;
}

export const useMapNavigationFeature = ({
  location,
  selectedPoiType,
  setCalloutVisible,
  setSelectedPoiType,
  setSelectedLocation,
  setShowLocationCard,
  setSelectedLocationInfo,
  routes,
  getRoutes,
  clearRoutes,
  isFetchingRoutes,
  routeError,
  searchNearby,
}: UseMapNavigationFeatureProps) => {
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
  // } = useLiveNavigation({ onReroute: handleReroute, simulatedLocation: location });

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
    clearRoutes();
    setSelectedRoute(null);
    setDestination(null);
    setDestinationMarker(null);
    setDestinationInfo(null);
    setShowDestinationCard(false);
  };

  
  const handleNavigateToLocation = (selectedLoc: any) => {
    if (!destinationInfo || !location) return;

    console.log("Planning route to:", destinationInfo.name);
    const destinationString = `${destinationInfo.latitude},${destinationInfo.longitude}`;
    setDestination(destinationString);
    getRoutes(location.coords, destinationString);
    if (selectedLoc) {
      setDestinationMarker({
        latitude: selectedLoc.latitude,
        longitude: selectedLoc.longitude,
        name: selectedLoc.name,
      });
    }
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

  const handleNearbySearch = (query: string) => {
    console.log("💡 handleNearbySearch called with query:", query);
    if (!location) {
      console.log("💡 handleNearbySearch: No user location available.");
      return;
    }
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('警察局')) {
      handleCancelRouteSelection();
      setSelectedPoiType('police');
      console.log("handleNearbySearch: Setting selectedPoiType to 'police'.");
    } else if (lowerQuery.includes('便利商店') || lowerQuery.includes('超商')) {
      handleCancelRouteSelection();
      setSelectedPoiType('store');
      console.log("handleNearbySearch: Setting selectedPoiType to 'store' and calling searchNearby for '超商'.");
      searchNearby(location.coords, "超商");
    } else {
      handleCancelRouteSelection();
      setSelectedPoiType(null); // For generic nearby search, clear specific POI type
      console.log("💡 💡 handleNearbySearch: Performing generic nearby search for query:", query);
      searchNearby(location.coords, query);
    }
  };

  // Auto-selection and auto-start logic
  useEffect(() => {
    if (routes.length > 0) {
      const newSelectedRoute = routes.find(r => r.mode === 'safest') || routes[0];
      setSelectedRoute(newSelectedRoute);

      // console.log("Auto-selected route:", newSelectedRoute.mode);
      if (isNavigating) {
        updateRoute(newSelectedRoute);
      }

      if (pendingAutoNavigateTo && !isNavigating && location) {
        // console.log('Auto-starting navigation to pending destination');
        handleStartNavigation(newSelectedRoute);
        setPendingAutoNavigateTo(null);
      }
    }
  }, [routes, pendingAutoNavigateTo, isNavigating]);

  // Periodic recalculation
  // useEffect(() => {
  //   if (destination && location && !isNavigating) {
  //     const now = Date.now();
  //     if (now - lastRecalculation.current > 10000) {
  //       getRoutes(location.coords, destination);
  //       lastRecalculation.current = now;
  //     }
  //   }
  // }, [location, isNavigating, destination]);

  return {
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
    handleNavigateToLocation,
    handleSearch,
    handleNearbySearch,
  };
};
