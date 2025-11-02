import { MaterialIcons } from '@expo/vector-icons';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  ActivityIndicator,
  Text,
  Linking,
  Platform,
  Alert,
  Image,
  Animated,
} from 'react-native';
import PoliceStationIcon from '@/assets/icons/temp-police-station.svg';
// 直接使用 Image 组件，不需要导入 SVG
import Constants from "expo-constants";
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;
import React, { useEffect, useState, useRef } from 'react';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import polyline from '@mapbox/polyline'; // Import polyline
import TrackModeCard from '@/components/Tracking/track_base';
import Card_ongoing from '@/components/Tracking/track_ongoning';
import ReportSafetyCard from '@/components/Tracking/ReportSafetyCard';
import MapCarousel from '@/components/Map/carousel';
import ToolCard from '@/components/Safety_tools/tools_card';
import { useTracking } from '@/context/TrackProvider';
import { useEmergencyListener } from '@/hooks/useEmergencyListener';
import EmergencyList from '@/components/Emergency/EmergencyList';
import EmergencyInfoModal from '@/components/Emergency/EmergencyInfoModal';
import { useAuth } from '@/context/AuthProvider';
import LocationSentCard from '@/components/Tracking/LocationSentCard';
import { pois } from '../../constants/pois';
import { POI } from '@/types';
import { EmergencyData } from '@/types/emergency';
import MapSearchBar from '@/components/Map/MapSearchBar';
import { useRoutePlanner } from '@/apis/useRoutePlanner';
import RouteCarousel from '@/components/Map/RouteCarousel';
import { RouteInfo } from '@/types';
import { decodePolyline } from '@/utils/polyline';
import LocationCard from '@/components/Map/LocationCard';

import { useLiveNavigation } from '@/hooks/useLiveNavigation';
import NavigationInstructionsCard from '@/components/Map/NavigationInstructionsCard';
import { POLICE_STATION_ICON, CONVENIENCE_STORE_ICON } from '@/constants/svgIcons';

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
  const { trackingModes, isTracking, trackingModeId, isReportDue, isInfoSent, stopTrackingMode } = useTracking();
  const { emergencyData: emergencies } = useEmergencyListener();
  const [showToolCard, setShowToolCard] = useState(true);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyData | null>(null);
  const [bottomComponentHeight, setBottomComponentHeight] = useState(0);
  const [showLocationSentCard, setShowLocationSentCard] = useState(false);

  const { routes, error, getRoutes, loading: isFetchingRoutes, clearRoutes } = useRoutePlanner();
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [placeToConfirm, setPlaceToConfirm] = useState<{ description: string; latitude: number; longitude: number } | null>(null);
  const lastRecalculation = useRef<number>(0);

  const [selectedPoiType, setSelectedPoiType] = useState<'police' | 'store' | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [calloutVisible, setCalloutVisible] = useState<string | null>(null); // 儲存正在顯示 callout 的標記 ID
  const [selectedPoliceStation, setSelectedPoliceStation] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    walkingTime: string | null;
  } | null>(null);    

  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  
  const calculateWalkingTime = async (origin: Location.LocationObject, destination: { latitude: number; longitude: number }) => {
    try {
      console.log('Calculating walking time for:', {
        origin: `${origin.coords.latitude},${origin.coords.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`
      });

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.coords.latitude},${origin.coords.longitude}&destination=${destination.latitude},${destination.longitude}&mode=walking&alternatives=true&language=zh-TW&key=${GOOGLE_MAPS_API_KEY}`;
      console.log('API Key being used:', GOOGLE_MAPS_API_KEY);
      console.log('Request URL:', url);
      
      const response = await fetch(url);
      
      const data = await response.json();
      console.log('Google Directions API response:', data);

      if (data.status !== 'OK') {
        console.error('Google Directions API error:', data.status);
        return '計算錯誤';
      }

      if (data.routes && data.routes[0] && data.routes[0].legs && data.routes[0].legs[0]) {
        // 只返回文字部分，不返回完整的 duration 對象
        const durationText = data.routes[0].legs[0].duration.text;
        console.log('Walking duration:', durationText);
        return durationText;
      }
      
      console.log('No valid route found');
      return '無法計算';
    } catch (error) {
      console.error('Error calculating walking time:', error);
      return '計算錯誤';
    }
  };

  const handlePoliceStationPress = async (station: any) => {
    if (!location) {
      console.log('No current location available');
      return;
    }
    
    console.log('Police station pressed:', station);
    
    // 清除現有的路線選擇狀態
    setDestination(null);
    setSelectedRoute(null);
    clearRoutes();
    
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

    console.log("規劃路線到警察局:", selectedPoliceStation.name);
    const destinationString = `${selectedPoliceStation.latitude},${selectedPoliceStation.longitude}`;
    setDestination(destinationString);
    getRoutes(location.coords, destinationString);
    setSelectedPoliceStation(null); // 關閉警察局卡片
    setCalloutVisible(null); // 隱藏 callout
  };

  const handleNavigateToLocation = () => {
    if (!selectedLocation || !location) return;

    console.log("規劃路線到:", selectedLocation.name);
    const destinationString = `${selectedLocation.latitude},${selectedLocation.longitude}`;
    setDestination(destinationString);
    getRoutes(location.coords, destinationString);
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
    startTestNavigation,
    stopNavigation,
    updateRoute,
    currentStep,
    remainingDistance,
    eta,
  } = useLiveNavigation({ onReroute: handleReroute });

  const [isSearchingSafeSpot, setIsSearchingSafeSpot] = useState(false);
  
  const tabBarHeight = screenHeight * 0.12; 

  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  const handleMarkerPress = (markerId: string) => {
    setActiveMarker(markerId);
    Animated.timing(scaleAnimation, {
      toValue: activeMarker === markerId ? 1 : 1.2,
      duration: 200,
      useNativeDriver: true
    }).start();
  };

  const auth = useAuth();
  const currentUserId = auth.user?.uid;

  const styles = createStyles(bottomComponentHeight, tabBarHeight, selectedPoliceStation !== null, selectedLocation !== null);

   useEffect(() => {
    const initialLocation = {
      coords: {
        latitude: 25.03,
        longitude: 121.54,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as Location.LocationObject;
    setLocation(initialLocation);
  }, []);
  // useEffect(() => {
  //   (async () => {
  //     let { status } = await requestForegroundPermissionsAsync();
  //     if (status === 'granted') {
  //       let currentLocation = await getCurrentPositionAsync();
  //       setLocation({
  //         latitude: currentLocation.coords.latitude,
  //         longitude: currentLocation.coords.longitude,
  //         latitudeDelta: 0.01,
  //         longitudeDelta: 0.01,
  //       });
  //     } else {
  //       console.log('Location permission not granted');
  //       // Optionally, set a default location or show an error message
  //       setLocation({
  //         latitude: 23, // Fallback to a default if permission not granted
  //         longitude: 120.2,
  //         latitudeDelta: 0.0922,
  //         longitudeDelta: 0.0421,
  //       });
  //     }
  //   })();
  // }, []);

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
  }, [emergencies]);

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
      // 設置選中的位置為最近的安全地點
      setSelectedLocation({
        name: bestRoute.name,
        address: `${bestRoute.type === 'police' ? '警察局' : '便利商店'} - ${bestRoute.duration.text}步行距離`,
        latitude: bestRoute.latitude,
        longitude: bestRoute.longitude
      });

      // 移動地圖到選定位置
      mapRef.current?.fitToCoordinates([origin, {latitude: bestRoute.latitude, longitude: bestRoute.longitude}], {
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

  let carouselData: any[] = [];

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
        />
      ),
    }));
    carouselData.push(...modeCards);
  }

  useEffect(() => {
    if (isInfoSent) {
      setShowLocationSentCard(true);
    }
  }, [isInfoSent]);

  const handleDismissLocationSentCard = () => {
    stopTrackingMode();
    setShowLocationSentCard(false);
  };

  const handleSearch = (query: string, latitude?: number, longitude?: number) => {
    if (location) {
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
    setSelectedLocation({
      name: description.split(',')[0], // 取第一部分作为名称
      address: description,
      latitude: latitude,
      longitude: longitude
    });
    
    // 移动地图到选定位置
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: latitude,
        longitude: longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const handleStartNavigation = (route: RouteInfo) => {
    if (location) {
      console.log("--- Starting Test Navigation ---");
      startTestNavigation(route, location.coords);
      // 清除 POI 選擇和 callout
      setSelectedPoiType(null);
      setCalloutVisible(null);
    }
  };

  const handleCancelRouteSelection = () => {
    setDestination(null);
    setSelectedRoute(null);
    setSelectedPoliceStation(null); // 清除警察局卡片
    setCalloutVisible(null); // 隱藏 callout
    clearRoutes();
  };

  useEffect(() => {
    if (routes.length > 0) {
      const newSelectedRoute = routes.find(r => r.mode === 'safest') || routes[0];
      setSelectedRoute(newSelectedRoute);
      // If we are already navigating, this means this is a reroute.
      // Update the navigation hook with the new route.
      if (isNavigating) {
        updateRoute(newSelectedRoute);
      }
    }
  }, [routes]);

  const getRouteColor = (mode: string, isSelected: boolean) => {
    if (isSelected) return '#007BFF'; // 選中的路線顯示藍色
    return '#808080'; // 未選中的路線統一顯示灰色
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>正在獲取您的位置...</Text>
      </View>
    );
  }

  const filteredPois = selectedPoiType ? pois.filter(poi => poi.type === selectedPoiType) : [];

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
        onPress={() => setCalloutVisible(null)} // 點擊地圖時隱藏所有 callout
      >
        {navUserLocation && (
          <Marker
            coordinate={navUserLocation.coords}
            title="My Location"
            pinColor="blue"
          />
        )}

        {emergencies && emergencies.map(emergency => (
          <Marker
            key={emergency.emergencyDocId}
            coordinate={{ latitude: emergency.lat, longitude: emergency.long }}
            title={`求救: ${emergency.trackedUserName}`}
            description={emergency.updateTime ? `最後更新: ${emergency.updateTime.toDate().toLocaleTimeString()}` : '沒有可用的更新時間'}
            pinColor="red"
            onPress={() => setSelectedEmergency(emergency)}
          />
        ))}
        {filteredPois.map(poi => (
          <Marker.Animated
            key={poi.id}
            coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
            title={poi.name}
            tracksViewChanges={false}
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
          >
            <Animated.View style={{ transform: [{ scale: activeMarker === poi.id ? scaleAnimation : 1 }] }}>
              {poi.type === 'police' ? (
                <Image 
                  source={require('@/assets/icons/police-station.png')}
                  style={{ width: 32, height: 32 }}
                />
              ) : (
                <Image 
                  source={require('@/assets/icons/family-mart.png')}
                  style={{ width: 32, height: 32 }}
                />
              )}
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
        {isNavigating ? (
          <>
            <Polyline coordinates={remainingPath} strokeColor="#007BFF" strokeWidth={6} />
            <Polyline coordinates={traveledPath} strokeColor="gray" strokeWidth={6} />
          </>
        ) : (
          routes.map(route => {
            const isSelected = selectedRoute?.polyline === route.polyline;
            // 先渲染未選中的路線，後渲染選中的路線
            if (!isSelected) {
              return (
                <Polyline
                  key={route.polyline}
                  coordinates={decodePolyline(route.polyline)}
                  strokeColor={getRouteColor(route.mode, false)}
                  strokeWidth={3}
                  onPress={() => setSelectedRoute(route)}
                  tappable
                  zIndex={1}
                />
              );
            }
            // 最後渲染選中的路線，確保它在最上層
            return (
              <Polyline
                key={`${route.polyline}-selected`}
                coordinates={decodePolyline(route.polyline)}
                strokeColor={getRouteColor(route.mode, true)}
                strokeWidth={6}
                onPress={() => setSelectedRoute(route)}
                tappable
                zIndex={999}
              />
            )
          })
        )}
      </MapView>

      {!isNavigating && (
        <View style={styles.filterContainer}>
          <Pressable
            style={[styles.filterButton, selectedPoiType === 'police' && styles.selectedFilterButton]}
            onPress={() => {
              setSelectedPoiType(selectedPoiType === 'police' ? null : 'police');
              setCalloutVisible(null); // 切換篩選時隱藏所有 callout
            }}
          >
            <Text style={styles.filterButtonText}>警察局</Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, selectedPoiType === 'store' && styles.selectedFilterButton]}
            onPress={() => {
              setSelectedPoiType(selectedPoiType === 'store' ? null : 'store');
              setCalloutVisible(null); // 切換篩選時隱藏所有 callout
            }}
          >
            <Text style={styles.filterButtonText}>便利商店</Text>
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

      {routes.length === 0 ? (
        <>
          <EmergencyList emergencies={emergencies} onSelectEmergency={setSelectedEmergency} />
          <EmergencyInfoModal emergency={selectedEmergency} onClose={() => setSelectedEmergency(null)} />

          <Pressable
            style={styles.toolToggleButton}
            onPress={() => setShowToolCard(prev => !prev)}
          >
            <MaterialIcons name={showToolCard ? "map" : "apps"} size={24} color="black" />
          </Pressable>

          {!selectedPoliceStation && !selectedLocation && (
            <View style={styles.bottomComponentContainer} onLayout={(event) => setBottomComponentHeight(event.nativeEvent.layout.height)}>
              {!showToolCard && <MapCarousel data={carouselData} />}
              {showToolCard && <ToolCard showBottomBar={true} onFindSafeSpot={findNearestSafeSpot} />}
            </View>
          )}

          {showLocationSentCard && <LocationSentCard onDismiss={handleDismissLocationSentCard} />}

          {isSearchingSafeSpot && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={{ marginTop: 10 }}>正在搜尋最近的安全地點...</Text>
            </View>
          )}
        </>
      ) : (
        !isNavigating && (
          <View style={styles.bottomComponentContainer}>
            <RouteCarousel 
              routes={routes}
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
              onStartNavigation={handleStartNavigation}
            />
            <Pressable style={styles.cancelRouteButton} onPress={handleCancelRouteSelection}>
              <Text style={styles.cancelRouteButtonText}>取消路線</Text>
            </Pressable>
          </View>
        )
      )}

      {isNavigating && (
        <View style={styles.bottomComponentContainer}>
          <Pressable style={styles.endNavigationButton} onPress={stopNavigation}>
            <Text style={styles.endNavigationButtonText}>結束導航</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.recenterButton} onPress={recenterMap}>
        <MaterialIcons name="my-location" size={24} color="black" />
      </Pressable>

      {placeToConfirm && (
        <View style={styles.confirmationContainer}>
          <Text style={styles.confirmationText}>
            選擇安全路線到: {placeToConfirm.description}？
          </Text>
          <View style={styles.confirmationButtons}>
            <Pressable
              style={[styles.confirmationButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => {
                if (location && placeToConfirm) {
                  setDestination(placeToConfirm.description);
                  getRoutes(location.coords, `${placeToConfirm.latitude},${placeToConfirm.longitude}`);
                  lastRecalculation.current = Date.now();
                  setPlaceToConfirm(null); // Dismiss confirmation
                }
              }}
            >
              <Text style={styles.confirmationButtonText}>確認</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmationButton, { backgroundColor: '#F44336' }]}
              onPress={() => setPlaceToConfirm(null)} // Dismiss confirmation
            >
              <Text style={styles.confirmationButtonText}>取消</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Location Cards */}
      <View style={[styles.bottomComponentContainer, { zIndex: 1001 }]}>
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

        {selectedLocation && (
          <LocationCard
            name={selectedLocation.name}
            address={selectedLocation.address}
            onClose={() => setSelectedLocation(null)}
            onNavigate={handleNavigateToLocation}
            locationType="general"
          />
        )}
      </View>
    </View>
  );
}

function createStyles(
  bottomComponentHeight: number, 
  tabBarHeight: number, 
  hasPoliceStation: boolean,
  hasLocation: boolean
) {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
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
      bottom: bottomComponentHeight + tabBarHeight + 90,
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
    recenterButton: {
      position: 'absolute',
      bottom: (hasPoliceStation || hasLocation) ? 
        (bottomComponentHeight + tabBarHeight + 90) : 
        (bottomComponentHeight + tabBarHeight + 20),
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
    endNavigationButton: {
      backgroundColor: 'rgba(255, 100, 100, 0.9)',
      padding: 15,
      borderRadius: 10,
      margin: 10,
      alignItems: 'center',
    },
    endNavigationButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    bottomComponentContainer: {
        position: 'absolute',
        bottom: tabBarHeight + 10,
        left: 0,
        right: 0,
        zIndex: 1000,
        elevation: 5, // for Android
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        backgroundColor: 'transparent',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    cancelRouteButton: {
      backgroundColor: 'gray',
      padding: 15,
      borderRadius: 10,
      margin: 10,
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
  });
}
