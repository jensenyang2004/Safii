// frontend/app/(tabs)/map.tsx

import { MaterialIcons } from '@expo/vector-icons';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  Image,
  Keyboard,
  Animated,
  Pressable,
  Alert,
} from 'react-native';

import Constants from "expo-constants";
import React, { useEffect, useState, useRef } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

// --- Components ---
import TrackModeCard from '@/components/Tracking/track_base';
import Card_ongoing from '@/components/Tracking/track_ongoning';
import ReportSafetyCard from '@/components/Tracking/ReportSafetyCard';
import MapCarousel from '@/components/Map/carousel';
import SharingSessionCard from '@/components/Tracking/SharingSessionCard';
import AvatarMarker from '@/components/Map/AvatarMarker';
import EmergencyInfoModal from '@/components/Emergency/EmergencyInfoModal';
import MapSearchBar from '@/components/Map/MapSearchBar';
import RouteCarousel from '@/components/Map/RouteCarousel';
import LocationCard from '@/components/Map/LocationCard';
import NavigationInstructionsCard from '@/components/Map/NavigationInstructionsCard'; // V1 功能保留

// --- Hooks (V2 Style: Modular) ---
import { useTracking } from '@/context/TrackProvider';
import { useEmergencyListener } from '@/hooks/useEmergencyListener';
import { useFriendSharing } from '@/hooks/useFriendSharing';
import { useRoutePlanner } from '@/apis/useRoutePlanner';
import { useNearbyPlaces, PlaceInfo } from '@/apis/useNearbyPlaces';
import { useLiveNavigation } from '@/hooks/useLiveNavigation';

// --- Types & Constants ---
import { pois } from '@/constants/pois';
import { POI, RouteInfo } from '@/types';
import { EmergencyData } from '@/types/emergency';
import Theme from '@/constants/Theme';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// --- Helper Functions ---
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

// V2 Unified Interface: 統一所有地點類型
interface DisplayableLocation {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type?: 'police' | 'store' | 'friend' | 'search' | 'general' | 'safe_spot';
  walkingTime?: string | null;
}

export default function Map() {
  // --- 1. Basic Location & Ref ---
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [heading, setHeading] = useState(0);
  const mapRef = useRef<MapView>(null);
  
  // --- 2. Tracking & Social Hooks (From V1) ---
  const { trackingModes, isTracking, trackingModeId, isReportDue } = useTracking();
  const { emergencyData: emergencies } = useEmergencyListener();
  const { sharedByFriends } = useFriendSharing();
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyData | null>(null);

  // --- 3. Unified State (From V2) ---
  // 這一個 state 取代了 V1 的 selectedPoliceStation, nearestSafeSpotData, destinationInfo
  const [selectedLocationInfo, setSelectedLocationInfo] = useState<DisplayableLocation | null>(null);
  const [showLocationCard, setShowLocationCard] = useState(false);
  
  // 為了在地圖上顯示紅色的終點 Marker
  const [destinationMarker, setDestinationMarker] = useState<{ latitude: number, longitude: number, name: string } | null>(null);

  // --- 4. Navigation & Routing Hooks (From V2 - Refactored Logic) ---
  const { routes, getRoutes, loading: isFetchingRoutes, clearRoutes } = useRoutePlanner();
  const { places, loading: isSearchingPlaces, searchNearby, clearPlaces } = useNearbyPlaces();
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(null);
  const [destinationString, setDestinationString] = useState<string | null>(null);

  const {
    isNavigating,
    userLocation: navUserLocation,
    traveledPath,
    remainingPath,
    startNavigation,
    stopNavigation,
    updateRoute,
    currentStep,     // V1 功能: 用於顯示指示卡
    remainingDistance, // V1 功能
    eta,             // V1 功能
  } = useLiveNavigation({ onReroute: handleReroute });

  // --- 5. UI & Animation State ---
  const [mapCarouselHeight, setMapCarouselHeight] = useState(0);
  const [selectedPoiType, setSelectedPoiType] = useState<'police' | 'store' | null>(null);
  const [isFindingSafeSpot, setIsFindingSafeSpot] = useState(false); // 取代 V1 的 isSearchingSafeSpot

  const routeSheetAnimation = useRef(new Animated.Value(0)).current;
  const tabBarHeight = screenHeight * 0.09;

  // --- UI Layout Logic ---
  const LOCATION_CARD_HEIGHT = 160;
  const ROUTE_CAROUSEL_HEIGHT = 180;
  const END_NAVIGATION_BUTTON_HEIGHT = 60;

  // 決定 Bottom Sheet 的高度
  let currentContentHeight = 0;
  if (showLocationCard && selectedLocationInfo) {
    currentContentHeight = LOCATION_CARD_HEIGHT;
  } else if (routes.length > 0 && !isNavigating) {
    currentContentHeight = ROUTE_CAROUSEL_HEIGHT;
  } else if (isNavigating) {
    currentContentHeight = END_NAVIGATION_BUTTON_HEIGHT;
  }

  const routeSheetHeight = currentContentHeight > 0 ? currentContentHeight + tabBarHeight : 0;
  const showRouteSheet = currentContentHeight > 0;

  const routeSheetHeightAnim = routeSheetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, routeSheetHeight],
  });

  // --- Handlers (Logic Integration) ---

  // 計算步行時間 (Helper)
  const calculateWalkingTime = async (origin: Location.LocationObject, dest: { latitude: number; longitude: number }) => {
    try {
      const originStr = `${origin.coords.latitude},${origin.coords.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${dest.latitude},${dest.longitude}&mode=walking&language=zh-TW&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.routes[0]?.legs[0]) {
        return data.routes[0].legs[0].duration.text;
      }
      return '無法計算';
    } catch (error) {
      console.error('Walking time error:', error);
      return null;
    }
  };

  // V1 功能移植: 尋找最近安全點
  const handleFindNearestSafeSpot = async () => {
    if (!location) {
      Alert.alert('錯誤', '無法獲取當前位置');
      return;
    }
    
    setIsFindingSafeSpot(true);
    handleCancelRouteSelection(); // 清除現有路線

    // 簡單邏輯: 遍歷所有 POI 找最近的 (V1 邏輯)
    let minDistance = Infinity;
    let nearest: POI | null = null;

    pois.forEach(poi => {
      // 這裡假設只找警察局作為最安全的點
      if (poi.type === 'police') {
        const dist = haversineDistance(location.coords, { latitude: poi.latitude, longitude: poi.longitude });
        if (dist < minDistance) {
          minDistance = dist;
          nearest = poi;
        }
      }
    });

    if (nearest) {
      const nearestPoi = nearest as POI; // TypeScript casting
      const walkingTime = await calculateWalkingTime(location, nearestPoi);
      
      const safeSpotInfo: DisplayableLocation = {
        id: nearestPoi.id,
        name: nearestPoi.name,
        address: nearestPoi.address || '安全地點',
        latitude: nearestPoi.latitude,
        longitude: nearestPoi.longitude,
        type: 'safe_spot',
        walkingTime: walkingTime
      };

      handleMarkerPress(safeSpotInfo);
    } else {
      Alert.alert('提示', '附近沒有找到安全地點');
    }
    setIsFindingSafeSpot(false);
  };

  // 統一的 Marker 點擊處理
  const handleMarkerPress = async (locationData: DisplayableLocation) => {
    handleCancelRouteSelection(); // Reset previous state

    // 設定 UI 顯示
    setSelectedLocationInfo({ ...locationData, walkingTime: locationData.walkingTime || '計算中...' });
    setShowLocationCard(true);
    setDestinationMarker({
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      name: locationData.name
    });

    // 動畫移動地圖
    mapRef.current?.animateToRegion({
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 800);

    // 如果沒有步行時間，計算之
    if (location && !locationData.walkingTime && (locationData.type === 'police' || locationData.type === 'store' || locationData.type === 'safe_spot')) {
      const time = await calculateWalkingTime(location, locationData);
      setSelectedLocationInfo(prev => prev ? { ...prev, walkingTime: time } : null);
    }
  };

  // 取消選擇/重置
  const handleCancelRouteSelection = () => {
    setDestinationString(null);
    setSelectedRoute(null);
    setDestinationMarker(null);
    setSelectedLocationInfo(null);
    setShowLocationCard(false);
    clearRoutes();
    clearPlaces();
  };

  // 開始規劃路線 (Call API)
  const handlePlanRoute = () => {
    if (!selectedLocationInfo || !location) return;

    const destStr = `${selectedLocationInfo.latitude},${selectedLocationInfo.longitude}`;
    const poiId = (selectedLocationInfo.type === 'police' || selectedLocationInfo.type === 'store') ? selectedLocationInfo.id : null;

    setDestinationString(destStr);
    getRoutes(location.coords, destStr, poiId, places);
    
    // 隱藏地點卡片，準備顯示路線卡片
    setShowLocationCard(false);
  };

  // 開始導航 (Real Navigation)
  const handleStartNavigation = (route: RouteInfo) => {
    if (location) {
      startNavigation(route);
      setShowLocationCard(false);
    }
  };

  // 自動重新規劃 (Reroute)
  async function handleReroute(newOrigin: Location.LocationObject) {
    if (destinationString) {
      await getRoutes(newOrigin.coords, destinationString, null, places);
    }
  }

  // 搜尋列處理
  const handleSearch = (query: string, lat?: number, lng?: number) => {
    if (location) {
      handleCancelRouteSelection();
      const dest = (lat && lng) ? `${lat},${lng}` : query;
      setDestinationString(dest);
      getRoutes(location.coords, dest, null, []);
      if (lat && lng) {
        setDestinationMarker({ latitude: lat, longitude: lng, name: query.split(',')[0] });
      }
    }
  };

  // 附近搜尋 (Filters)
  const handleNearbySearch = (query: string) => {
    if (!location) return;
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('警察局')) {
      handleCancelRouteSelection();
      setSelectedPoiType('police');
    } else if (lowerQuery.includes('便利商店') || lowerQuery.includes('超商')) {
      handleCancelRouteSelection();
      setSelectedPoiType('store');
      searchNearby(location.coords, "超商");
    } else {
      handleCancelRouteSelection();
      setSelectedPoiType(null);
      searchNearby(location.coords, query);
    }
  };

  const handleSuggestionSelected = (desc: string, lat: number, lng: number) => {
    const loc: DisplayableLocation = {
      name: desc.split(',')[0],
      address: desc,
      latitude: lat,
      longitude: lng,
      type: 'search'
    };
    handleMarkerPress(loc);
  };

  // --- Effects ---

  // 1. Get User Location & Heading
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      // setLocation(loc);

      // await Location.watchHeadingAsync((obj) => {
      //   setHeading(obj.trueHeading);
      // });

      const testLocation = {
           coords: {
             latitude: 25.0330,
             longitude: 121.5650,
             altitude: null,
             accuracy: null,
             altitudeAccuracy: null,
             heading: null,
             speed: null,
           },
           timestamp: Date.now(),
         };
       // 將這個測試地點設定給 App
       setLocation(testLocation as Location.LocationObject);
      
    })();
  }, []);

  // 2. Animate Camera during Navigation
  useEffect(() => {
    if (isNavigating && navUserLocation && mapRef.current) {
      mapRef.current.animateCamera({
        center: navUserLocation.coords,
        heading: navUserLocation.coords.heading ?? 0,
        pitch: 45,
        zoom: 18,
      }, { duration: 1000 });
    }
  }, [navUserLocation, isNavigating]);

  // 3. Animation for Bottom Sheet
  useEffect(() => {
    Animated.timing(routeSheetAnimation, {
      toValue: showRouteSheet ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showRouteSheet]);

  // --- Render Data Preparation ---
  
  // Filter Static POIs (Police)
  const staticFilteredPois = selectedPoiType === 'police' && location
    ? pois.filter(p => p.type === 'police' && haversineDistance(location.coords, p) <= 5) // 5km 內
    : [];

  // Carousel Data (V1 Feature Preserved)
  let carouselData: any[] = [];
  carouselData.push({ id: 'sharing-sessions', component: <SharingSessionCard /> });

  if (isTracking && trackingModeId) {
    const activeMode = trackingModes.find(mode => mode.id === trackingModeId);
    if (activeMode) {
      carouselData.push({ 
        id: isReportDue ? 'report-safety' : activeMode.id, 
        component: isReportDue ? <ReportSafetyCard /> : <Card_ongoing trackingMode={activeMode} /> 
      });
    }
  } else {
    carouselData.push(...(trackingModes ?? []).map((mode: any) => ({
      id: mode.id,
      component: <TrackModeCard {...mode} contacts={mode.contacts.map((c: any) => ({ id: c.id, name: c.username, url: 'none' }))} />
    })));
  }

  const styles = createStyles(mapCarouselHeight, tabBarHeight, showLocationCard);

  // Loading Screen
  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={{ marginTop: 10 }}>定位中...</Text>
      </View>
    );
  }

  const userDisplayLocation = navUserLocation || location;

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
        showsUserLocation={false} // Custom marker used
        showsCompass={true}
        compassOffset={{ x: -8, y: 50 }}
        onPress={() => Keyboard.dismiss()}
      >
        {/* User Location Marker */}
        {userDisplayLocation && (
          <Marker coordinate={userDisplayLocation.coords} anchor={{ x: 0.5, y: 0.5 }} style={{ zIndex: 100 }}>
            <MaterialIcons name="navigation" size={28} color={Theme.colors.primary} style={{ transform: [{ rotate: `${heading}deg` }] }} />
          </Marker>
        )}

        {/* Destination Marker */}
        {destinationMarker && (
          <Marker coordinate={destinationMarker} title={destinationMarker.name} pinColor="red" />
        )}

        {/* V1 Feature: Emergency Markers */}
        {emergencies.map(em => (
          <Marker key={em.emergencyDocId} coordinate={{ latitude: em.lat, longitude: em.long }} onPress={() => setSelectedEmergency(em)}>
            <AvatarMarker userName={em.trackedUserName} avatarUrl={em.trackedUserAvatarUrl} outlineColor="red" />
          </Marker>
        ))}

        {/* V1 Feature: Friend Markers */}
        {sharedByFriends.map(friend => (
          <Marker 
            key={friend.sessionId} 
            coordinate={{ latitude: friend.lat, longitude: friend.long }}
            onPress={() => handleMarkerPress({
              name: friend.sharingUserName, address: "即時位置", latitude: friend.lat, longitude: friend.long, type: 'friend'
            })}
          >
            <AvatarMarker userName={friend.sharingUserName} avatarUrl={friend.sharingUserAvatarUrl} outlineColor="white" />
          </Marker>
        ))}

        {/* Static POIs (Police) */}
        {staticFilteredPois.map(poi => (
          <Marker
            key={poi.id}
            coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
            onPress={() => handleMarkerPress({ ...poi, type: 'police' })}
          >
            <Image source={require('@/assets/icons/police-station.png')} style={{ width: 32, height: 32 }} />
          </Marker>
        ))}

        {/* Dynamic Places (Stores/Search) */}
        {places.map((place: PlaceInfo) => (
          <Marker
            key={place.place_id}
            coordinate={{ latitude: place.geometry.location.lat, longitude: place.geometry.location.lng }}
            onPress={() => handleMarkerPress({
              id: place.place_id, name: place.name, address: place.vicinity, latitude: place.geometry.location.lat, longitude: place.geometry.location.lng, type: 'store'
            })}
          >
            {/* <Image source={require('@/assets/icons/location-icon.png')} style={{ width: 32, height: 32 }} /> */}
          </Marker>
        ))}

        {/* Navigation Polylines */}
        {isNavigating ? (
          <>
            <Polyline coordinates={remainingPath} strokeColor={Theme.colors.primary} strokeWidth={6} />
            <Polyline coordinates={traveledPath} strokeColor="gray" strokeWidth={6} />
          </>
        ) : (
          routes.map((route, idx) => (
            <Polyline
              key={`route-${idx}`}
              coordinates={route.polyline}
              strokeColor={selectedRoute?.polyline === route.polyline ? Theme.colors.primary : 'gray'}
              strokeWidth={selectedRoute?.polyline === route.polyline ? 6 : 3}
              zIndex={selectedRoute?.polyline === route.polyline ? 999 : 1}
              onPress={() => setSelectedRoute(route)}
              tappable={true}
            />
          ))
        )}
      </MapView>

      {/* --- UI Overlays --- */}

      {/* 1. Search Bar */}
      {!isNavigating && (
        <MapSearchBar 
          onSearch={handleSearch} 
          onNearbySearch={handleNearbySearch} 
          onSuggestionSelected={handleSuggestionSelected} 
          userLocation={location?.coords} 
        />
      )}

      {/* 2. Filters & Actions (Merged V1 Top Features) */}
      {!isNavigating && (
        <View style={styles.filterContainer}>
          <Pressable
            style={[styles.filterButton, selectedPoiType === 'police' && styles.selectedFilterButton]}
            onPress={() => {
              if (selectedPoiType === 'police') {
                setSelectedPoiType(null);
                handleCancelRouteSelection();
              } else {
                handleCancelRouteSelection();
                setSelectedPoiType('police');
              }
            }}
          >
            <Text style={[styles.filterButtonText, selectedPoiType === 'police' && styles.selectedFilterButtonText]}>警察局</Text>
          </Pressable>

          <Pressable
            style={[styles.filterButton, selectedPoiType === 'store' && styles.selectedFilterButton]}
            onPress={() => {
              if (selectedPoiType === 'store') {
                setSelectedPoiType(null);
                clearPlaces();
              } else {
                if (location) {
                  handleCancelRouteSelection();
                  setSelectedPoiType('store');
                  searchNearby(location.coords, "超商");
                }
              }
            }}
          >
            <Text style={[styles.filterButtonText, selectedPoiType === 'store' && styles.selectedFilterButtonText]}>便利商店</Text>
          </Pressable>

          {/* V1 Feature: Find Safe Spot Button */}
          <Pressable
            style={[styles.filterButton, styles.safeSpotButton]}
            onPress={handleFindNearestSafeSpot}
          >
             {isFindingSafeSpot ? (
               <ActivityIndicator size="small" color="#fff" />
             ) : (
               <Text style={[styles.filterButtonText, {color: '#fff'}]}>尋找安全點</Text>
             )}
          </Pressable>
        </View>
      )}

      {/* 3. Navigation Instructions (V1 Feature Restored) */}
      {isNavigating && (
        <NavigationInstructionsCard
          currentStep={currentStep}
          remainingDistance={remainingDistance}
          eta={eta}
        />
      )}

      {/* 4. Loading Indicators */}
      {(isFetchingRoutes || isSearchingPlaces) && (
        <View style={styles.reroutingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.reroutingText}>處理中...</Text>
        </View>
      )}

      {/* 5. Emergency Modal */}
      {selectedEmergency && (
        <EmergencyInfoModal emergency={selectedEmergency} onClose={() => setSelectedEmergency(null)} />
      )}

      {/* 6. Master Bottom Sheet (Complex UI) */}
      <View style={styles.masterBottomSheet}>
        {/* Layer 1: Tracking Cards Carousel (Always at bottom) */}
        <View
          style={styles.bottomComponentContainer}
          onLayout={(event) => {
            const h = event.nativeEvent.layout.height;
            if (h > 0 && h !== mapCarouselHeight) setMapCarouselHeight(h);
          }}
        >
          <MapCarousel data={carouselData} />
        </View>

        {/* Layer 2: Location/Route Details (Slide up) */}
        <Animated.View style={[styles.routeSheetContainer, { height: routeSheetHeightAnim, opacity: routeSheetAnimation }]}>
          
          {/* A. Location Card */}
          {showLocationCard && selectedLocationInfo && (
            <LocationCard
              name={selectedLocationInfo.name}
              address={selectedLocationInfo.address}
              walkingTime={selectedLocationInfo.walkingTime}
              onClose={() => {
                setShowLocationCard(false);
                setSelectedLocationInfo(null);
                setDestinationMarker(null);
              }}
              onNavigate={handlePlanRoute}
              locationType={selectedLocationInfo.type || 'general'}
            />
          )}

          {/* B. Route Carousel */}
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

          {/* C. End Navigation Button */}
          {isNavigating && (
            <Pressable style={styles.endNavigationButton} onPress={stopNavigation}>
              <Text style={styles.endNavigationButtonText}>結束導航</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

// --- Styles ---
function createStyles(bottomHeight: number, tabBarHeight: number, isLocationCardVisible: boolean) {
  return StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    map: { ...StyleSheet.absoluteFillObject },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Filters
    filterContainer: {
      position: 'absolute',
      top: 110, // Below Search Bar
      left: 10,
      right: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      zIndex: 1,
      flexWrap: 'wrap',
    },
    filterButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      margin: 4,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3,
    },
    selectedFilterButton: { backgroundColor: Theme.colors.primary },
    filterButtonText: { color: 'black', fontWeight: 'bold', fontSize: 13 },
    selectedFilterButtonText: { color: 'white' },
    safeSpotButton: { backgroundColor: '#FFC107' }, // Distinct color for Safe Spot

    // Overlays
    reroutingContainer: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10,
    },
    reroutingText: { color: 'white', marginTop: 10, fontSize: 16 },

    // Bottom Sheet
    masterBottomSheet: {
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, paddingBottom: tabBarHeight,
    },
    bottomComponentContainer: {
      // Base layer for carousel
    },
    routeSheetContainer: {
      backgroundColor: 'transparent',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 15,
      overflow: 'hidden',
    },
    
    // Buttons
    cancelRouteButton: {
      backgroundColor: 'gray', padding: 12, borderRadius: 50, margin: 10, width: '90%', alignSelf: 'center', alignItems: 'center',
    },
    cancelRouteButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    endNavigationButton: {
      backgroundColor: Theme.colors.primary, padding: 15, borderRadius: 50, margin: 20, alignItems: 'center',
    },
    endNavigationButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  });
}