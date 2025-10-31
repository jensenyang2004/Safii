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
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
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
import { SAFE_SPOTS } from '../../constants/SafeSpots';
import MapSearchBar from '@/components/Map/MapSearchBar';
import { useRoutePlanner } from '@/apis/useRoutePlanner';
import RouteCarousel from '@/components/Map/RouteCarousel';
import { RouteInfo } from '@/types';
import { decodePolyline } from '@/utils/polyline';
import Constants from 'expo-constants';
import { useLiveNavigation } from '@/hooks/useLiveNavigation';
import NavigationInstructionsCard from '@/components/Map/NavigationInstructionsCard';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ?? '';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Map() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const { trackingModes, isTracking, trackingModeId, isReportDue, isInfoSent, stopTrackingMode } = useTracking();
  const { emergencyData: emergencies } = useEmergencyListener();
  const [showToolCard, setShowToolCard] = useState(true);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [bottomComponentHeight, setBottomComponentHeight] = useState(0);
  const [showLocationSentCard, setShowLocationSentCard] = useState(false);

  const { routes, error, getRoutes, loading: isFetchingRoutes, clearRoutes } = useRoutePlanner();
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [placeToConfirm, setPlaceToConfirm] = useState<{ description: string; latitude: number; longitude: number } | null>(null);
  const lastRecalculation = useRef<number>(0);

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

  const [nearestSpot, setNearestSpot] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  
  const tabBarHeight = screenHeight * 0.12; 

  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);

  const auth = useAuth();
  const currentUserId = auth.currentUser?.uid;

  const styles = createStyles(bottomComponentHeight, tabBarHeight);

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
    if (!location) return;
    console.log('Finding nearest safe spot...');
    const origin = location.coords;

    let bestRoute = null;
    let shortestDuration = Infinity;

    for (const spot of SAFE_SPOTS) {
      const destination = `${spot.latitude},${spot.longitude}`;
      const originStr = `${origin.latitude},${origin.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}`;

      try {
        const res = await fetch(url);
        const json = await res.json();

        if (json.routes.length > 0) {
          const route = json.routes[0];
          const leg = route.legs[0];
          const duration = leg.duration.value;

          if (duration < shortestDuration) {
            shortestDuration = duration;
            bestRoute = {
              ...spot,
              ...leg,
              polyline: route.overview_polyline.points,
            };
          }
        }
      } catch (e) {
        console.error('Error fetching directions:', e);
      }
    }

    if (bestRoute) {
      const decodedPolyline = polyline.decode(bestRoute.polyline).map(p => ({ latitude: p[0], longitude: p[1] }));
      setRouteCoordinates(decodedPolyline);
      setNearestSpot(bestRoute);

      mapRef.current?.fitToCoordinates([origin, {latitude: bestRoute.latitude, longitude: bestRoute.longitude}], {
        edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
        animated: true,
      });
    }
  };

  const openInMaps = () => {
    if (!nearestSpot || !location) return;

    const destination = `${nearestSpot.latitude},${nearestSpot.longitude}`;
    const origin = `${location.coords.latitude},${location.coords.longitude}`;
    const url = Platform.select({
      ios: `maps:?saddr=${origin}&daddr=${destination}`,
      android: `google.navigation:q=${destination}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

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
    setPlaceToConfirm({ description, latitude, longitude });
  };

  const handleStartNavigation = (route: RouteInfo) => {
    if (location) {
      console.log("--- Starting Test Navigation ---");
      startTestNavigation(route, location.coords);
    }
  };

  const handleCancelRouteSelection = () => {
    setDestination(null);
    setSelectedRoute(null);
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
    if (isSelected) return '#007BFF'; // A distinct blue for selected routes
    if (mode === 'fastest') return '#F44336'; // Red for fastest
    if (mode === 'shortest') return '#4CAF50'; // Green for shortest
    if (mode === 'safest') return '#FFC107'; // Amber for safest
    return 'gray'; // Fallback
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>正在獲取您的位置...</Text>
      </View>
    );
  }

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
        {SAFE_SPOTS.map(spot => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            title={spot.name}
            pinColor={spot.type === 'police' ? 'blue' : 'green'}
          />
        ))}
        {routeCoordinates.length > 0 && (
          <Polyline coordinates={routeCoordinates} strokeColor="#FF0000" strokeWidth={3} />
        )}
        
        {isNavigating ? (
          <>
            <Polyline coordinates={remainingPath} strokeColor="#007BFF" strokeWidth={6} />
            <Polyline coordinates={traveledPath} strokeColor="gray" strokeWidth={6} />
          </>
        ) : (
          routes.map(route => {
            const isSelected = selectedRoute?.polyline === route.polyline;
            return (
              <Polyline
                key={route.polyline}
                coordinates={decodePolyline(route.polyline)}
                strokeColor={getRouteColor(route.mode, isSelected)}
                strokeWidth={isSelected ? 6 : 3}
                onPress={() => setSelectedRoute(route)}
                tappable
                zIndex={isSelected ? 100 : 1} // Make selected route appear on top
              />
            )
          })
        )}
      </MapView>

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

          <View style={styles.bottomComponentContainer} onLayout={(event) => setBottomComponentHeight(event.nativeEvent.layout.height)}>
            {!showToolCard && <MapCarousel data={carouselData} />}
            {showToolCard && <ToolCard showBottomBar={true} onFindSafeSpot={findNearestSafeSpot} />}
          </View>

          {showLocationSentCard && <LocationSentCard onDismiss={handleDismissLocationSentCard} />}

          {nearestSpot && (
            <View style={styles.nearestSpotCard}>
              <Text style={styles.nearestSpotTitle}>最快的安全路線</Text>
              <Text style={styles.nearestSpotName}>{nearestSpot.name}</Text>
              <Text>距離: {nearestSpot.distance.text}</Text>
              <Text>預計到達時間: {nearestSpot.duration.text}</Text>
              <Pressable style={styles.goToButton} onPress={openInMaps}>
                <Text style={styles.goToButtonText}>在 Google 地圖中打開</Text>
              </Pressable>
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
    </View>
  );
}

function createStyles(bottomComponentHeight: number, tabBarHeight: number) {               
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
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
      bottom: bottomComponentHeight + tabBarHeight + 20,
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
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    nearestSpotCard: {
      position: 'absolute',
      bottom: screenHeight / 2 - 100,
      left: screenWidth * 0.1,
      right: screenWidth * 0.1,
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1000,
    },
    nearestSpotTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    nearestSpotName: {
      fontSize: 16,
      marginBottom: 15,
    },
    goToButton: {
      backgroundColor: '#3498DB',
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 30,
      marginTop: 15,
    },
    goToButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
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
  });
}