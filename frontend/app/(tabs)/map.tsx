import { MaterialIcons } from '@expo/vector-icons';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  ActivityIndicator, // ADDED
  Text, // ADDED
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';
import {
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
} from 'expo-location';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CARD_WIDTH = screenWidth * 0.8;
const SPACING = screenWidth * 0.03;
const SIDE_PADDING = (screenWidth - CARD_WIDTH) / 2;
const SNAP_INTERVAL = CARD_WIDTH + SPACING;

export default function Map() {
  const [location, setLocation] = useState(null); // CHANGED to null

  const { trackingModes, isTracking, trackingModeId, isReportDue, isInfoSent } = useTracking();
  const { emergencyData: emergencies } = useEmergencyListener();
  const [showToolCard, setShowToolCard] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [bottomComponentHeight, setBottomComponentHeight] = useState(0);
  const [showLocationSentCard, setShowLocationSentCard] = useState(false); // New state
  
  const tabBarHeight = screenHeight * 0.12; 

  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);


  const auth = useAuth();
  const currentUserId = auth.currentUser?.uid;

  const styles = createStyles(bottomComponentHeight, tabBarHeight);   

  useEffect(() => {
    (async () => {
      let { status } = await requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let currentLocation = await getCurrentPositionAsync();
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        console.log('Location permission not granted');
        // Optionally, set a default location or show an error message
        setLocation({
          latitude: 23, // Fallback to a default if permission not granted
          longitude: 120.2,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    })();
  }, []);

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


  const recenterMap = async () => {
    if (mapRef.current) {
      try {
        let { status } = await requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission not granted');
          return;
        }
        let currentLocation = await getCurrentPositionAsync();
        const newRegion = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        mapRef.current.animateToRegion(newRegion, 1000);
      } catch (error) {
        console.error("Failed to recenter map:", error);
      }
    }
  };

  let carouselData: any[] = [];

  if (isTracking && trackingModeId) {
    const activeMode = trackingModes.find(mode => mode.id === trackingModeId);
    if (activeMode) {
      if (isReportDue) {
        carouselData.push({
          id: 'report-safety',
          component: <ReportSafetyCard />,
        });
      } else {
        carouselData.push({
          id: activeMode.id,
          component: <Card_ongoing trackingMode={activeMode} />,
        });
      }
    }
  } else {
    const modeCards = (trackingModes ?? []).map((mode: any) => ({
      id: mode.id,
      component: (
        <TrackModeCard
          id={mode.id}
          name={mode.name}
          contacts={mode.contacts.map((c: any) => ({
            id: c.id,
            name: c.username,
            url: 'none',
          }))}
          checkIntervalMinutes={mode.checkIntervalMinutes}
        />
      ),
    }));
    carouselData.push(...modeCards);
  }

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isInfoSent) { // If tracking provider says info is sent
      setShowLocationSentCard(true); // Show the card
      console.log('showLocationSentCard has been set to true');
      timer = setTimeout(() => {
        setShowLocationSentCard(false); // Hide after 10 seconds
      }, 10000); // 10 seconds
    }
    return () => {
      clearTimeout(timer); // Clean up the timer if component unmounts or isInfoSent changes
    };
  }, [isInfoSent]);

  const handleDismissLocationSentCard = () => {
    setShowLocationSentCard(false);
  };

  if (!location) { // CONDITIONAL RENDERING
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={location}
        showsUserLocation={true}
        mapType="standard"
        showsCompass={true} 
        compassOffset={{ x: -8, y: 50 }}    
      >
        {emergencies && emergencies.map(emergency => (
          <Marker
            key={emergency.emergencyDocId}
            coordinate={{
              latitude: emergency.lat,
              longitude: emergency.long,
            }}
            title={`SOS: ${emergency.trackedUserName}`}
            description={emergency.updateTime ? `Last update: ${emergency.updateTime.toDate().toLocaleTimeString()}` : 'No update time available'}
            pinColor="red"
            onPress={() => setSelectedEmergency(emergency)}
          />
        ))}
      </MapView>

      <EmergencyList emergencies={emergencies} onSelectEmergency={setSelectedEmergency} />
      <EmergencyInfoModal emergency={selectedEmergency} onClose={() => setSelectedEmergency(null)} />

      {/*temporarily disable tool toggle button for the beta 0.1 version*/}
      {/*<Pressable
        style={styles.toolToggleButton}
        onPress={() => setShowToolCard(prev => !prev)}
      >
        <MaterialIcons name={showToolCard ? "map" : "apps"} size={24} color="black" />
      </Pressable>*/}

      <Pressable style={styles.recenterButton} onPress={recenterMap}>
        <MaterialIcons name="my-location" size={24} color="black" />
      </Pressable>

      <View style={styles.bottomComponentContainer} onLayout={(event) => setBottomComponentHeight(event.nativeEvent.layout.height)}>
        {!showToolCard && <MapCarousel data={carouselData} />}
        {showToolCard && <ToolCard showBottomBar={true} />}
      </View>


      {showLocationSentCard && <LocationSentCard onDismiss={handleDismissLocationSentCard} />}

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
    toolToggleButton: {
      position: 'absolute',
      bottom: bottomComponentHeight + tabBarHeight + 30 + 50 + 10, // Increased spacing
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
      bottom: bottomComponentHeight + tabBarHeight + 20, // Increased spacing
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
    bottomComponentContainer: {
        position: 'absolute',
        bottom: tabBarHeight + 10, // Add 10px margin above tab bar
        left: 0,
        right: 0,
    },
    loadingContainer: { // ADDED
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}