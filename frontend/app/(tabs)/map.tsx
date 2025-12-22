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
import { useTracking } from '@/context/TrackProvider';
import { useEmergencyListener } from '@/hooks/useEmergencyListener';
import { useFriendSharing } from '@/hooks/useFriendSharing';
import EmergencyInfoModal from '@/components/Emergency/EmergencyInfoModal';
import LocationSentCard from '@/components/Tracking/LocationSentCard';
import SharingSessionCard from '@/components/Tracking/SharingSessionCard';
import AvatarMarker from '@/components/Map/AvatarMarker';
import { EmergencyBubble } from '@/components/Emergency/EmergencyBubbles';
import { useSafeSpotSearch } from '@/hooks/useSafeSpotSearch';
import { useMapNavigationFeature } from '@/hooks/useMapNavigationFeature';
import { calculateWalkingTime } from '@/libs/googleMaps';
import { usePoiFilter } from '@/hooks/usePoiFilter';

import { POI } from '@/types';
import { EmergencyData } from '@/types/emergency';
import MapSearchBar from '@/components/Map/MapSearchBar';
import RouteCarousel from '@/components/Map/RouteCarousel';

import LocationCard from '@/components/Map/LocationCard';
import NavigationInstructionsCard from '@/components/Map/NavigationInstructionsCard';
import Theme from '@/constants/Theme';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Map() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  const { trackingModes, isTracking, trackingModeId, isReportDue, isInfoSent, stopTrackingMode } = useTracking();
  const activeMode = trackingModes.find(mode => mode.id === trackingModeId);
  const { emergencyData: emergencies } = useEmergencyListener();
  const { sharedByFriends } = useFriendSharing();
  // const [showToolCard, setShowToolCard] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyData | null>(null);
  const [bottomComponentHeight, setBottomComponentHeight] = useState(0);
  const [showLocationSentCard, setShowLocationSentCard] = useState(false);

  const tabBarHeight = screenHeight * 0.09;

  const mapRef = useRef<MapView>(null);

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
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showFindSafeSpotCard, setShowFindSafeSpotCard] = useState(false);

  // Hook 1: Safe Spot Search
  const {
    isSearchingSafeSpot,
    showIntermediateSafeSpotCard,
    showNearestSafeSpotCard,
    nearestSafeSpotData,
    setShowNearestSafeSpotCard,
    setShowIntermediateSafeSpotCard,
    setNearestSafeSpotData,
    findNearestSafeSpot,
  } = useSafeSpotSearch({
    setDestinationInfo: (info) => setDestinationInfo(info),
    setShowDestinationCard: (show) => setShowDestinationCard(show),
    setSelectedPoliceStation,
  });

  // Hook 2: Map Navigation Feature
  const {
    routes,
    isFetchingRoutes,
    selectedRoute,
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
  } = useMapNavigationFeature({
    location,
    setCalloutVisible,
    setSelectedPoiType,
    setSelectedPoliceStation,
    setSelectedLocation,
  });

  const handlePoliceStationPress = async (station: any) => {
    if (!location) {
      console.log('No current location available');
      return;
    }

    console.log('Police station pressed:', station);

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

    setSelectedPoliceStation(prev => {
      if (!prev) return null;
      return {
        ...prev,
        walkingTime: walkingTime
      };
    });
  };

  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  const [mapCarouselHeight, setMapCarouselHeight] = useState(0);
  const routeSheetAnimation = useRef(new Animated.Value(0)).current;

  const LOCATION_CARD_HEIGHT = 150;
  const ROUTE_CAROUSEL_HEIGHT = 180;
  const END_NAVIGATION_BUTTON_HEIGHT = 35;

  let currentContentHeight = 0;
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
      }, { duration: 1000 });
    }
  }, [navUserLocation, isNavigating]);

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

  // Use the extracted POI filter hook
  const filteredPois = usePoiFilter(navUserLocation || location, selectedPoiType);

  useEffect(() => {
    console.log('DESTINATION STATE CHANGE ->', { destinationInfo, showDestinationCard });
  }, [destinationInfo, showDestinationCard]);

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>正在獲取您的位置...</Text>
      </View>
    );
  }

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
      setSelectedEmergency(null);
    } else {
      setSelectedEmergency(emergency);
    }
  };

  let carouselData: any[] = [];

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

  const handleDismissLocationSentCard = () => {
    stopTrackingMode({ isEmergency: true });
    setShowLocationSentCard(false);
  };

  const getRouteColor = (mode: string, isSelected: boolean) => {
    if (isSelected) return '#007BFF';
    return '#808080';
  };
  

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
                setCalloutVisible(null);
              } else {
                setCalloutVisible(poi.id);
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

      {!isNavigating && <MapSearchBar onSearch={handleSearch} onSuggestionSelected={(desc, lat, lng) => handleSuggestionSelected(desc, lat, lng, mapRef)} />}

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
                  await findNearestSafeSpot(location, mapRef);
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
                onNavigate={() => handleNavigateToPoliceStation(selectedPoliceStation)}
                locationType="police"
              />
            )}

            {destinationInfo && showDestinationCard && (
              <LocationCard
                name={destinationInfo.name}
                address={destinationInfo.address}
                onClose={() => setShowDestinationCard(false)}
                onNavigate={() => handleNavigateToLocation(selectedLocation)}
                locationType="general"
              />
            )}

            {showIntermediateSafeSpotCard && (
              <Pressable
                style={styles.intermediateCard}
                onPress={() => findNearestSafeSpot(location, mapRef)}
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
                    setDestinationInfo({
                        name: nearestSafeSpotData.name,
                        address: nearestSafeSpotData.address,
                        latitude: nearestSafeSpotData.latitude,
                        longitude: nearestSafeSpotData.longitude
                    }); // Set destination info state
                    
                    // Manually trigger route planning since we don't have setDestination in this scope anymore
                    // But we can set pending navigation
                    setPendingAutoNavigateTo({ latitude: nearestSafeSpotData.latitude, longitude: nearestSafeSpotData.longitude });
                    setDestinationMarker({
                      latitude: nearestSafeSpotData.latitude,
                      longitude: nearestSafeSpotData.longitude,
                      name: nearestSafeSpotData.name,
                    });
                    
                    setShowNearestSafeSpotCard(false); 
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