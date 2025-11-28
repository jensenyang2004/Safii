// frontend/app/%28tabs%29/map.tsx
import { MaterialIcons } from '@expo/vector-icons';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Text,
  Alert,
  Image,
  Animated,
  Keyboard,
} from 'react-native';

// 直接使用 Image 组件，不需要导入 SVG
import Constants from "expo-constants";
import React, { useEffect, useState, useRef } from 'react';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import TrackModeCard from '@/components/Tracking/track_base';
import Card_ongoing from '@/components/Tracking/track_ongoning';
import ReportSafetyCard from '@/components/Tracking/ReportSafetyCard';
import MapCarousel from '@/components/Map/carousel';
import ToolCard from '@/components/Safety_tools/tools_card';
import { useTracking } from '@/context/TrackProvider';
import { useEmergencyListener } from '@/hooks/useEmergencyListener';
import { useFriendSharing } from '@/hooks/useFriendSharing';
import EmergencyList from '@/components/Emergency/EmergencyList';
import EmergencyInfoModal from '@/components/Emergency/EmergencyInfoModal';
import LocationSentCard from '@/components/Tracking/LocationSentCard';
import SharingSessionCard from '@/components/Tracking/SharingSessionCard';
import AvatarMarker from '@/components/Map/AvatarMarker';
import { EmergencyBubble } from '@/components/Emergency/EmergencyBubbles';
import { decodePolyline } from '@/utils/polyline';

import { pois } from '../../constants/pois';
import { POI } from '@/types';
import { EmergencyData } from '@/types/emergency';
import MapSearchBar from '@/components/Map/MapSearchBar';
import { useRoutePlanner } from '@/apis/useRoutePlanner';
import RouteCarousel from '@/components/Map/RouteCarousel';
import { RouteInfo } from '@/types';

import LocationCard from '@/components/Map/LocationCard';
import { useAuth } from '@/context/AuthProvider';
import { useLiveNavigation } from '@/hooks/useLiveNavigation';
import NavigationInstructionsCard from '@/components/Map/NavigationInstructionsCard';
import Theme from '@/constants/Theme';



const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const haversineDistance = (
  coords1: { latitude: number; longitude: number },
  coords2: { latitude: number; longitude: number }
) => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function Map() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  // const { trackingModes, isTracking, trackingModeId, isReportDue, isInfoSent, stopTrackingMode, justReportedSafety, setJustReportedSafety } = useTracking();

  const { trackingModes, isTracking, trackingModeId, isReportDue, isInfoSent, stopTrackingMode } = useTracking();
  const activeMode = trackingModes.find(mode => mode.id === trackingModeId);
  const { emergencyData: emergencies } = useEmergencyListener();
  const { sharedByFriends } = useFriendSharing();
  const [showToolCard, setShowToolCard] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyData | null>(null);
  const [bottomComponentHeight, setBottomComponentHeight] = useState(0);
  const [showLocationSentCard, setShowLocationSentCard] = useState(false); // New state


  const tabBarHeight = screenHeight * 0.09;

  const mapRef = useRef<MapView>(null);

  const calculateWalkingTime = async (origin: Location.LocationObject, destination: { latitude: number; longitude: number }) => {
    try {
      const originStr = `${origin.coords.latitude},${origin.coords.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destination.latitude},${destination.longitude}&mode=walking&language=zh-TW&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('Google Directions API error:', data.status);
        return '計算錯誤';
      }

      if (data.routes && data.routes[0] && data.routes[0].legs && data.routes[0].legs[0]) {
        return data.routes[0].legs[0].duration.text;
      }

      return '無法計算';
    } catch (error) {
      console.error('Error calculating walking time:', error);
      return '計算錯誤';
    }
  };

  // Routing and POI related state (restored)
  const { routes, error, getRoutes, loading: isFetchingRoutes, clearRoutes } = useRoutePlanner();
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [placeToConfirm, setPlaceToConfirm] = useState<{ description: string; latitude: number; longitude: number } | null>(null);
  const lastRecalculation = useRef<number>(0);
  const [selectedPoiType, setSelectedPoiType] = useState<'police' | 'store' | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [calloutVisible, setCalloutVisible] = useState<string | null>(null);
  const [selectedPoliceStation, setSelectedPoliceStation] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    walkingTime: string | null;
  } | null>(null);
  const [destinationInfo, setDestinationInfo] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showDestinationCard, setShowDestinationCard] = useState(false);
  const [destinationMarker, setDestinationMarker] = useState<{ latitude: number, longitude: number, name: string } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showFindSafeSpotCard, setShowFindSafeSpotCard] = useState(false);

  const handlePoliceStationPress = async (station: any) => {
    if (!location) {
      console.log('No current location available');
      return;
    }

    console.log('Police station pressed:', station);

    // 使用 calculateWalkingTime 來獲取預估時間
    setSelectedPoliceStation({
      name: station.name || '警察局',
      address: station.address || station.description || '',
      latitude: station.latitude,
      longitude: station.longitude,
      walkingTime: '計算中...'
    });

    const walkingTime = await calculateWalkingTime(location, {
      latitude: station.latitude,
      longitude: station.longitude
    });

    // 更新警察局資訊包含步行時間
    setSelectedPoliceStation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        walkingTime: walkingTime
      };
    });
  };

  const handleNavigateToPoliceStation = () => {
    if (!selectedPoliceStation || !location) return;

    // console.log("規劃路線到警察局:", selectedPoliceStation.name);
    const destinationString = `${selectedPoliceStation.latitude},${selectedPoliceStation.longitude}`;
    setDestination(destinationString);

    // console.log("Calling getRoutes with:", location.coords, destinationString);
    getRoutes(location.coords, destinationString);
    // console.log("Route planning initiated.");

    setDestinationMarker({
      latitude: selectedPoliceStation.latitude,
      longitude: selectedPoliceStation.longitude,
      name: selectedPoliceStation.name,
    });
    setSelectedPoliceStation(null); // 關閉警察局卡片
    setCalloutVisible(null); // 隱藏 callout
    // console.log("finished handleNavigateToPoliceStation");
  };

  const handleNavigateToLocation = () => {
    if (!destinationInfo || !location) return;

    console.log("規劃路線到:", destinationInfo.name);
    const destinationString = `${destinationInfo.latitude},${destinationInfo.longitude}`;
    setDestination(destinationString);
    getRoutes(location.coords, destinationString);
    setDestinationMarker({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      name: selectedLocation.name,
    });
    setSelectedLocation(null); // 關閉位置卡片
  };

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

  const [isSearchingSafeSpot, setIsSearchingSafeSpot] = useState(false);
  const [showIntermediateSafeSpotCard, setShowIntermediateSafeSpotCard] = useState(false);
  const [showNearestSafeSpotCard, setShowNearestSafeSpotCard] = useState(false);
  const [nearestSafeSpotData, setNearestSafeSpotData] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    walkingTime?: string | null;
  } | null>(null);

  // When we trigger a navigation from a LocationCard (nearest spot), we set this
  // so that when `routes` are populated we can auto-start navigation like other flows.
  const [pendingAutoNavigateTo, setPendingAutoNavigateTo] = useState<{ latitude: number; longitude: number } | null>(null);


  // const flatListRef = useRef<FlatList>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  const [mapCarouselHeight, setMapCarouselHeight] = useState(0);
  const routeSheetAnimation = useRef(new Animated.Value(0)).current;

  // --- Heights for different bottom sheet stages ---
  // You can manually adjust these values after testing
  const LOCATION_CARD_HEIGHT = 150;
  const ROUTE_CAROUSEL_HEIGHT = 180;
  const END_NAVIGATION_BUTTON_HEIGHT = 35;
  // -------------------------------------------------

  let currentContentHeight = 0;
  // If the Find Safe Spot card or nearest-spot card is requested, reserve the location card height so the route sheet opens
  if (showFindSafeSpotCard || showNearestSafeSpotCard) {
    currentContentHeight = LOCATION_CARD_HEIGHT;
  } else if ((destinationInfo && showDestinationCard) || selectedPoliceStation) {
    currentContentHeight = LOCATION_CARD_HEIGHT;
  } else if (routes.length > 0 && !isNavigating) {
    currentContentHeight = ROUTE_CAROUSEL_HEIGHT;
  } else if (isNavigating) {
    currentContentHeight = END_NAVIGATION_BUTTON_HEIGHT;
  }

  const routeSheetHeight = currentContentHeight > 0 ? currentContentHeight + tabBarHeight : 0;
  const showRouteSheet = currentContentHeight > 0;
  const isLocationCardVisible = !!selectedPoliceStation || !!selectedLocation;

  useEffect(() => {
    Animated.timing(routeSheetAnimation, {
      toValue: showRouteSheet ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // Using false for layout properties animation
    }).start();
  }, [showRouteSheet]);

  const topCarouselBottom = routeSheetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [
      mapCarouselHeight + tabBarHeight,
      routeSheetHeight + mapCarouselHeight + tabBarHeight,
    ],
  });

  const routeSheetHeightAnim = routeSheetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, routeSheetHeight],
  });

  const handleMarkerPress = (markerId: string) => {
    setActiveMarker(markerId);
  };

  // const auth = useAuth();
  // const currentUserId = auth.user?.uid;

  // const styles = createStyles(tabBarHeight, selectedPoliceStation !== null, destinationInfo !== null);
  // createStyles expects (tabBarHeight, hasPoliceStation, hasLocation)
  const styles = createStyles(bottomComponentHeight, tabBarHeight, selectedPoliceStation !== null, destinationInfo !== null);


  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  const getDynamicZoom = (speed: number | null) => {
    if (speed === null || speed < 0) return 18; // Default zoom if speed is unavailable
    if (speed < 5) return 18; // Walking speed, zoomed in
    if (speed < 15) return 16; // Driving in city
    return 14; // Highway speed, zoomed out
  };

  useEffect(() => {
    if (isNavigating && navUserLocation && mapRef.current) {
      mapRef.current.animateCamera({
        center: navUserLocation.coords,
        heading: navUserLocation.coords.heading ?? 0,
        pitch: 45,
        zoom: getDynamicZoom(navUserLocation.coords.speed),
      }, { duration: 1000 }); // Slower duration for smoother zoom changes
    }
  }, [navUserLocation, isNavigating]);

  useEffect(() => {
    if (destination && location && !isNavigating) {
      const now = Date.now();
      if (now - lastRecalculation.current > 10000) { // Recalculate every 10 seconds
        getRoutes(location.coords, destination);
        lastRecalculation.current = now;
      }
    }
  }, [location, isNavigating]);

  useEffect(() => {
    if (selectedEmergency && mapRef.current) {
      const newRegion = {
        latitude: selectedEmergency.lat,
        longitude: selectedEmergency.long,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  }, [selectedEmergency]);

  useEffect(() => {
    if (emergencies && emergencies.length > 0 && !selectedEmergency && mapRef.current) {
      const firstEmergency = emergencies[0];
      const newRegion = {
        latitude: firstEmergency.lat,
        longitude: firstEmergency.long,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  }, [emergencies, selectedEmergency]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', `Failed to get routes: ${error.message}`);
    }
  }, [error]);

  const findNearestSafeSpot = async () => {
    if (!location) {
      Alert.alert('錯誤', '無法獲取當前位置');
      return;
    }

    setIsSearchingSafeSpot(true);
    console.log('Finding nearest safe spot...');
    const origin = location.coords;

    let bestRoute = null;
    let shortestDuration = Infinity;
    const MAX_WALKING_TIME = 20 * 60; // 20 minutes in seconds

    // 篩選出警察局和便利商店
    const safeSpots = pois.filter(poi => {
      const distance = haversineDistance(
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: poi.latitude, longitude: poi.longitude }
      );
      return (poi.type === 'police' || poi.type === 'store') && distance <= 2; // Within 2km
    });

    if (safeSpots.length === 0) {
      setIsSearchingSafeSpot(false);
      Alert.alert('提示', '附近2公里內未找到安全地點');
      return;
    }

    let errors = 0;
    for (const spot of safeSpots) {
      const destination = `${spot.latitude},${spot.longitude}`;
      const originStr = `${origin.latitude},${origin.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destination}&mode=walking&key=${GOOGLE_MAPS_API_KEY}`;

      try {
        const res = await fetch(url);
        const json = await res.json();

        if (json.status !== 'OK') {
          console.error('Google Directions API error:', json.status);
          continue;
        }

        if (json.routes.length > 0) {
          const route = json.routes[0];
          const leg = route.legs[0];
          const duration = leg.duration.value;

          // 只考慮20分鐘內可到達的地點
          if (duration < shortestDuration && duration <= MAX_WALKING_TIME) {
            shortestDuration = duration;
            bestRoute = {
              ...spot,
              distance: leg.distance,
              duration: leg.duration,
              polyline: route.overview_polyline.points,
            };
          }
        }
      } catch (e) {
        console.error('Error fetching directions:', e);
        errors++;
      }
    }

    if (errors === safeSpots.length) {
      setIsSearchingSafeSpot(false);
      Alert.alert('錯誤', '無法獲取路線資訊，請稍後再試');
      return;
    }

    if (bestRoute) {
      // Clear any existing destination info card
      setDestinationInfo(null);
      setShowDestinationCard(false);
      setSelectedPoliceStation(null); // Also clear police station card if it was showing

      // 設置選中的位置為最近的安全地點
      setNearestSafeSpotData({
        name: bestRoute.name,
        address: `${bestRoute.type === 'police' ? '警察局' : '便利商店'} - ${bestRoute.duration.text}步行距離`,
        latitude: bestRoute.latitude,
        longitude: bestRoute.longitude,
        walkingTime: bestRoute.duration.text,
      });
      setShowNearestSafeSpotCard(true);
      setShowIntermediateSafeSpotCard(false); // Hide intermediate card


      // 移動地圖到選定位置
      mapRef.current?.fitToCoordinates([origin, { latitude: bestRoute.latitude, longitude: bestRoute.longitude }], {
        edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
        animated: true,
      });
    } else {
      Alert.alert('提示', '附近20分鐘步行範圍內未找到合適的安全地點');
    }

    setIsSearchingSafeSpot(false);
  };

  // Removed openInMaps as we now use the LocationCard navigation

  const recenterMap = () => {
    const locationToCenter = navUserLocation || location;

    if (mapRef.current && locationToCenter) {
      const newRegion = {
        latitude: locationToCenter.coords.latitude,
        longitude: locationToCenter.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  const handleSelectEmergency = (emergency: any) => {
    if (selectedEmergency && selectedEmergency.emergencyDocId === emergency.emergencyDocId) {
      setSelectedEmergency(null); // Deselect if the same emergency is pressed again
    } else {
      setSelectedEmergency(emergency);
    }
  };

  let carouselData: any[] = [];

  // Add SharingSessionCard to the carousel data
  carouselData.push({
    id: 'sharing-sessions',
    component: <SharingSessionCard />,
  });

  if (isTracking && trackingModeId) {
    const activeMode = trackingModes.find(mode => mode.id === trackingModeId);
    if (activeMode) {
      if (isReportDue) {
        carouselData.push({ id: 'report-safety', component: <ReportSafetyCard /> });
      } else {
        carouselData.push({ id: activeMode.id, component: <Card_ongoing trackingMode={activeMode} /> });
      }
    }
  } else {
    const modeCards = (trackingModes ?? []).map((mode: any) => ({
      id: mode.id,
      component: (
        <TrackModeCard
          id={mode.id}
          name={mode.name}
          contacts={mode.contacts.map((c: any) => ({ id: c.id, name: c.username, url: 'none' }))}
          checkIntervalMinutes={mode.checkIntervalMinutes}
          intervalReductionMinutes={mode.intervalReductionMinutes}
        />
      ),
    }));
    carouselData.push(...modeCards);
  }

  const topCarouselData: any[] = [
    {
      id: 'recenter-button',
      component: (
        <Pressable style={styles.recenterBubble} onPress={recenterMap}>
          <MaterialIcons name="my-location" size={24} color="black" />
        </Pressable>
      ),
    },
    {
      id: 'find-safe-spot',
      component: (
        <Pressable style={styles.findSafeBubble} onPress={() => setShowFindSafeSpotCard(true)}>
          <MaterialIcons name="warning" size={22} color="black" />
        </Pressable>
      ),
    },
    ...(emergencies ?? []).map((emergency: any) => ({
      id: emergency.emergencyDocId,
      component: (
        <EmergencyBubble
          emergency={emergency}
          onPress={() => handleSelectEmergency(emergency)}
        />
      ),
    })),
  ];

  useEffect(() => {
    if (isInfoSent) { // If tracking provider says info is sent
      setShowLocationSentCard(true); // Show the card
    }
  }, [isInfoSent]);

  const handleDismissLocationSentCard = () => {
    stopTrackingMode({ isEmergency: true });
    setShowLocationSentCard(false);
  };

  const handleSearch = (query: string, latitude?: number, longitude?: number) => {
    if (location) {
      setDestinationMarker(null);
      setSelectedLocation(null);
      setDestination(query); // Keep the query for display purposes if needed

      if (latitude !== undefined && longitude !== undefined) {
        // If coordinates are provided, use them as the destination
        getRoutes(location.coords, `${latitude},${longitude}`);
      } else {
        // Otherwise, use the query string as the destination
        getRoutes(location.coords, query);
      }
      lastRecalculation.current = Date.now();
    }
  };

  const handleSuggestionSelected = (description: string, latitude: number, longitude: number) => {
    const locationData = {
      name: description.split(',')[0], // 取第一部分作為名稱
      address: description,
      latitude: latitude,
      longitude: longitude
    };
    console.log('handleSuggestionSelected called with:', { description, latitude, longitude });
    setSelectedLocation(locationData);
    setDestinationMarker(locationData);
    setDestinationInfo(locationData);
    setShowDestinationCard(true);

    // 移動地圖到選定位置
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: latitude,
        longitude: longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  // Debug: track destinationInfo / showDestinationCard changes to help diagnose why the LocationCard may not appear
  useEffect(() => {
    console.log('DESTINATION STATE CHANGE ->', { destinationInfo, showDestinationCard });
  }, [destinationInfo, showDestinationCard]);

  const handleStartNavigation = (route: RouteInfo) => {
    if (location) {
      console.log("--- Starting Real Navigation ---");
      startNavigation(route);
      // 清除 POI 選擇和 callout
      setSelectedPoiType(null);
      setCalloutVisible(null);
      setDestinationInfo(null);
      setShowDestinationCard(false);
    }
  };

  const handleCancelRouteSelection = () => {
    setDestination(null);
    setSelectedRoute(null);
    setSelectedPoliceStation(null); // 清除警察局卡片
    setSelectedLocation(null);
    setDestinationMarker(null);
    setCalloutVisible(null); // 隱藏 callout
    clearRoutes();
    setDestinationInfo(null);
    setShowDestinationCard(false);
  };

  useEffect(() => {
    if (routes.length > 0) {
      const newSelectedRoute = routes.find(r => r.mode === 'safest') || routes[0];
      setSelectedRoute(newSelectedRoute);

      console.log("Auto-selected route:", newSelectedRoute.mode);
      // If we are already navigating, this means this is a reroute.
      // Update the navigation hook with the new route.
      if (isNavigating) {
        updateRoute(newSelectedRoute);
      }

      // If a UI action requested immediate navigation (e.g. user tapped LocationCard -> Navigate),
      // start navigation automatically when routes become available.
      if (pendingAutoNavigateTo && !isNavigating && location) {
        console.log('Auto-starting navigation to pending destination');
        // Use the existing handler so behavior matches other start-navigation flows
        handleStartNavigation(newSelectedRoute);
        setPendingAutoNavigateTo(null);
      }
    }
  }, [routes, pendingAutoNavigateTo, isNavigating, location]);

  useEffect(() => {
    console.log('IS_NAVIGATING:', isNavigating);
  }, [isNavigating]);

  const getRouteColor = (mode: string, isSelected: boolean) => {
    if (isSelected) return '#007BFF'; // 選中的路線顯示藍色
    return '#808080'; // 未選中的路線統一顯示灰色
  };

  // Helper to normalize route.polyline into an array of {latitude, longitude}
  const getCoordinatesFromPolyline = (polyline: any) => {
    if (!polyline) return [];
    // If it's a string, assume encoded polyline
    if (typeof polyline === 'string') {
      try {
        return decodePolyline(polyline);
      } catch (e) {
        console.warn('Failed to decode polyline string, returning empty coords.', e);
        return [];
      }
    }
    // If it's already an array
    if (Array.isArray(polyline)) {
      const first = polyline[0];
      if (!first) return [];
      // case: array of [lat, lng]
      if (Array.isArray(first) && first.length >= 2) {
        return (polyline as Array<[number, number]>).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
      }
      // case: array of { latitude, longitude }
      if (typeof first === 'object' && 'latitude' in first && 'longitude' in first) {
        return polyline as Array<{ latitude: number; longitude: number }>;
      }
    }
    return [];
  };



  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>正在獲取您的位置...</Text>
      </View>
    );
  }

  // ***

  // ***

  // const filteredPois = selectedPoiType ? pois.filter(poi => poi.type === selectedPoiType) : [];
  const filteredPois = selectedPoiType && location
    ? pois.filter(poi => {
      if (poi.type !== selectedPoiType) {
        return false;
      }
      const distance = haversineDistance(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { latitude: poi.latitude, longitude: poi.longitude }
      );
      return distance <= 2.2;
    })
    : [];
  console.log("Map component rendering...");
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        mapType="standard"
        showsCompass={true}
        compassOffset={{ x: -8, y: 50 }}
        onPress={() => { Keyboard.dismiss(); setCalloutVisible(null); }}
      >
        {navUserLocation && (
          <Marker
            coordinate={navUserLocation.coords}
            title="My Location"
            pinColor="blue"
          />
        )}

        {destinationMarker && (
          <Marker
            coordinate={destinationMarker}
            title={destinationMarker.name}
            pinColor="red"
          />
        )}

        {/* Marker for the nearest safe spot found by findNearestSafeSpot() */}
        {nearestSafeSpotData && showNearestSafeSpotCard && (
          <Marker
            coordinate={{ latitude: nearestSafeSpotData.latitude, longitude: nearestSafeSpotData.longitude }}
            title={nearestSafeSpotData.name}
            onPress={() => setShowNearestSafeSpotCard(true)}
            zIndex={999}
          >
            <Image
              source={require('@/assets/icons/police-station.png')}
              style={{ width: 32, height: 32 }}
            />
          </Marker>
        )}

        {emergencies && emergencies.map(emergency => (
          <Marker
            key={emergency.emergencyDocId}
            coordinate={{
              latitude: emergency.lat,
              longitude: emergency.long,
            }}
            onPress={() => handleSelectEmergency(emergency)}
          >
            <AvatarMarker
              userName={emergency.trackedUserName}
              avatarUrl={emergency.trackedUserAvatarUrl}
              outlineColor="red"
            />
          </Marker>
        ))}

        {sharedByFriends && sharedByFriends.map(friend => (
          <Marker
            key={friend.sessionId}
            coordinate={{
              latitude: friend.lat,
              longitude: friend.long,
            }}
          >
            <AvatarMarker
              userName={friend.sharingUserName}
              avatarUrl={friend.sharingUserAvatarUrl}
              outlineColor="white"
            />
          </Marker>
        ))}

        {filteredPois.map(poi => (
          <Marker.Animated
            key={poi.id}
            anchor={{ x: 0.5, y: 1 }}
            coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
            title={poi.name}
            tracksViewChanges={activeMarker === poi.id}
            onPress={() => {
              handleMarkerPress(poi.id);
              if (calloutVisible === poi.id) {
                setCalloutVisible(null);  // 如果已經顯示，則隱藏
              } else {
                setCalloutVisible(poi.id); // 顯示新的 callout
                if (poi.type === 'police') {
                  handlePoliceStationPress(poi);
                } else {
                  setSelectedPoi(poi);
                }
              }
            }}
            zIndex={activeMarker === poi.id ? 999 : 1}
          >
            <Animated.View style={{ transform: [{ scale: activeMarker === poi.id ? scaleAnimation : 1 }] }}>
              <Image
                source={poi.type === 'police' ? require('@/assets/icons/police-station.png') : require('@/assets/icons/family-mart.png')}
                style={{ width: 32, height: 32 }}
              />
            </Animated.View>
            {calloutVisible === poi.id && (
              <Callout tooltip={true}>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{poi.name}</Text>
                  {poi.type === 'police' && (
                    <Text style={styles.calloutDescription}>點擊以查看步行時間</Text>
                  )}
                </View>
              </Callout>
            )}
          </Marker.Animated>
        ))}

        {destinationInfo && (
          <Marker
            coordinate={{
              latitude: destinationInfo.latitude,
              longitude: destinationInfo.longitude,
            }}
            title={destinationInfo.name}
            pinColor="green"
            onPress={() => setShowDestinationCard(true)}
          />
        )}

        {isNavigating ? (
          <>
            <Polyline coordinates={remainingPath} strokeColor="#007BFF" strokeWidth={6} />
            <Polyline coordinates={traveledPath} strokeColor="gray" strokeWidth={6} />
          </>
        ) : (
          routes.map((route, index) => {
            const stableKey = `route-${route.mode}-${index}`;
            const isSelected = selectedRoute?.polyline === route.polyline;

            const points = route.polyline;

            if (!points || points.length < 2) {
              console.warn('Invalid polyline points');
              return null;
            }

            return (
              <Polyline
                key={stableKey}
                coordinates={points}
                strokeColor={getRouteColor(route.mode, isSelected)}
                strokeWidth={isSelected ? 6 : 3}
                zIndex={isSelected ? 999 : 1}
                onPress={() => setSelectedRoute(route)}
                tappable={true}
              />
            );
          })
        )}

      </MapView>

      <Animated.View style={[styles.topCarouselContainer, { bottom: topCarouselBottom }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topScrollViewContent}
        >
          {topCarouselData.map(item =>
            React.cloneElement(item.component, { key: item.id })
          )}
        </ScrollView>
      </Animated.View>

      {/* Top button now opens the bottom route-sheet LocationCard via showFindSafeSpotCard */}

      {selectedEmergency && (
        <EmergencyInfoModal emergency={selectedEmergency} onClose={() => setSelectedEmergency(null)} />
      )}

      {!isNavigating && (
        <View style={styles.filterContainer}>
          <Pressable
            style={[styles.filterButton, selectedPoiType === 'police' && styles.selectedFilterButton]}
            onPress={() => {
              setSelectedPoiType(selectedPoiType === 'police' ? null : 'police');
              setCalloutVisible(null);
            }}
          >
            <Text style={[styles.filterButtonText, selectedPoiType === 'police' && styles.selectedFilterButtonText]}>警察局</Text>
          </Pressable>
        </View>
      )}

      {isNavigating &&
        <NavigationInstructionsCard
          currentStep={currentStep}
          remainingDistance={remainingDistance}
          eta={eta}
        />
      }

      {isFetchingRoutes && (
        <View style={styles.reroutingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.reroutingText}>Rerouting...</Text>
        </View>
      )}

      {!isNavigating && <MapSearchBar onSearch={handleSearch} onSuggestionSelected={handleSuggestionSelected} />}

      {showLocationSentCard && activeMode && (
        <LocationSentCard
          onDismiss={handleDismissLocationSentCard}
          activityLocation={activeMode.activityLocation}
          activity={activeMode.activity}
          notes={activeMode.notes}
        />
      )}

      {isSearchingSafeSpot && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={{ marginTop: 10 }}>正在搜尋最近的安全地點...</Text>
        </View>
      )}

      <View style={styles.masterBottomSheet}>
        <View
          style={styles.bottomComponentContainer}
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            if (height > 0 && height !== mapCarouselHeight) {
              setMapCarouselHeight(height);
            }
          }}
        >
          <MapCarousel data={carouselData} />
        </View>
        <Animated.View
          style={[styles.routeSheetContainer, { height: routeSheetHeightAnim, opacity: routeSheetAnimation }]}
        >
          <View>
            {routes.length > 0 && !isNavigating && (
              <>
                <RouteCarousel
                  routes={routes}
                  selectedRoute={selectedRoute}
                  onSelectRoute={setSelectedRoute}
                  onStartNavigation={handleStartNavigation}
                />
                <Pressable style={styles.cancelRouteButton} onPress={handleCancelRouteSelection}>
                  <Text style={styles.cancelRouteButtonText}>取消路線</Text>
                </Pressable>
              </>
            )}

            {isNavigating && (
              <Pressable style={styles.endNavigationButton} onPress={stopNavigation}>
                <Text style={styles.endNavigationButtonText}>結束導航</Text>
              </Pressable>
            )}

            {showFindSafeSpotCard && (
              <LocationCard
                name="尋找安全地點"
                address="按下搜尋以尋找附近安全地點"
                onClose={() => setShowFindSafeSpotCard(false)}
                onNavigate={async () => {
                  // Wait for the search to finish and the nearestSpot card to be set
                  await findNearestSafeSpot();
                  // Close the Find Safe Spot card after nearest spot data is available.
                  setShowFindSafeSpotCard(false);
                }}
                locationType="general"
              />
            )}

            {selectedPoliceStation && (
              <LocationCard
                name={selectedPoliceStation.name}
                address={selectedPoliceStation.address}
                walkingTime={selectedPoliceStation.walkingTime}
                onClose={() => {
                  setSelectedPoliceStation(null);
                  setCalloutVisible(null);
                }}
                onNavigate={handleNavigateToPoliceStation}
                locationType="police"
              />
            )}

            {destinationInfo && showDestinationCard && (
              <LocationCard
                name={destinationInfo.name}
                address={destinationInfo.address}
                onClose={() => setShowDestinationCard(false)}
                onNavigate={handleNavigateToLocation}
                locationType="general"
              />
            )}

            {showIntermediateSafeSpotCard && (
              <Pressable
                style={styles.intermediateCard}
                onPress={findNearestSafeSpot}
              >
                <Text style={styles.intermediateCardText}>尋找安全地點</Text>
                <MaterialIcons name="arrow-forward" size={24} color="black" />
              </Pressable>
            )}

            {nearestSafeSpotData && showNearestSafeSpotCard && (
              <LocationCard
                name={nearestSafeSpotData.name}
                address={nearestSafeSpotData.address}
                walkingTime={nearestSafeSpotData.walkingTime}
                onClose={() => {
                  setShowNearestSafeSpotCard(false);
                  setNearestSafeSpotData(null);
                }}
                onNavigate={() => {
                  if (nearestSafeSpotData && location) {
                    const destinationString = `${nearestSafeSpotData.latitude},${nearestSafeSpotData.longitude}`;
                    setDestination(destinationString);
                    // Request routes — when routes arrive we'll auto-start navigation
                    getRoutes(location.coords, destinationString);
                    setDestinationMarker({
                      latitude: nearestSafeSpotData.latitude,
                      longitude: nearestSafeSpotData.longitude,
                      name: nearestSafeSpotData.name,
                    });
                    // mark pending auto-start so the routes useEffect will begin navigation
                    setPendingAutoNavigateTo({ latitude: nearestSafeSpotData.latitude, longitude: nearestSafeSpotData.longitude });
                    setShowNearestSafeSpotCard(false); // Close the card after initiating route planning
                  }
                }}
                locationType={nearestSafeSpotData.name.includes('警察局') ? 'police' : 'general'}
              />
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function createStyles(
  tabBarHeight: number,
  hasPoliceStation: boolean,
  hasLocation: boolean
) {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
    },
    masterBottomSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      paddingBottom: tabBarHeight + 80,
    },
    routeSheetContainer: {
      backgroundColor: 'transparent',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 15,
      overflow: 'hidden',
    },
    calloutContainer: {
      minWidth: 150,
      backgroundColor: 'white',
      padding: 12,
      borderRadius: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    calloutTitle: {
      textAlign: 'center',
      width: '100%',
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: 8,
    },
    calloutDescription: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
    },
    calloutButton: {
      backgroundColor: '#007BFF',
      padding: 10,
      borderRadius: 5,
      marginTop: 10,
      alignItems: 'center',
    },
    calloutButtonText: {
      color: 'white',
      textAlign: 'center',
      fontWeight: '600',
    },
    map: {
      width: '100%',
      height: '100%',
    },
    reroutingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 10,
    },
    reroutingText: {
      color: 'white',
      marginTop: 10,
      fontSize: 16,
    },
    toolToggleButton: {
      position: 'absolute',
      bottom: (hasPoliceStation || hasLocation) ?
        (tabBarHeight + 90) :
        (tabBarHeight + 20),
      right: 20,
      backgroundColor: 'rgba(255,255,255,0.9)',
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
      zIndex: 1,
    },
    topCarouselContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 30,
    },
    topScrollViewContent: {
      alignItems: 'center',
      paddingHorizontal: 12,

    },
    recenterBubble: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: 30,
      padding: 10,
      alignItems: 'center',
      marginHorizontal: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    bottomComponentContainer: {
      // This container no longer needs absolute positioning or margin
    },
    endNavigationButton: {
      backgroundColor: Theme.colors.primary,
      padding: 15,
      borderRadius: 50,
      margin: 20,
      alignItems: 'center',
    },
    endNavigationButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    intermediateCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#fff',
      padding: 12,
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 12,
      elevation: 3, // android shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    intermediateCardText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#111',
    },

    cancelRouteButton: {
      backgroundColor: 'gray',
      padding: 15,
      borderRadius: 50,
      margin: 10,
      width: '90%',
      alignSelf: 'center',
      alignItems: 'center',
    },
    cancelRouteButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    confirmationContainer: {
      position: 'absolute',
      bottom: tabBarHeight + 10,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      padding: 20,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 999, // Below search bar, above map
    },
    confirmationText: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
      textAlign: 'center',
    },
    confirmationButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    confirmationButton: {
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 10,
      minWidth: 100,
      alignItems: 'center',
    },
    confirmationButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    filterContainer: {
      position: 'absolute',
      top: 120, // Adjust as needed
      left: 10,
      right: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      zIndex: 1,
    },
    filterButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 20,
      marginHorizontal: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    selectedFilterButton: {
      backgroundColor: '#007BFF',
    },
    filterButtonText: {
      color: 'black',
      fontWeight: 'bold',
    },
    findSafeSpotButton: {
      backgroundColor: Theme.colors.primary, // Use a distinct color
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 20,
      marginHorizontal: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    findSafeSpotButtonText: {
      color: 'white',
      fontWeight: 'bold',
    },
    findSafeBubble: {
      flexDirection: 'row',
      backgroundColor: '#FFD54F',
      borderRadius: 30,
      padding: 10,
      alignItems: 'center',
      marginHorizontal: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    findSafeOverlay: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: tabBarHeight + 80,
      zIndex: 999,
    },
  });
}