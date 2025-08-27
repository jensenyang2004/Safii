import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Text,
  Pressable,
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
import SearchBar from '@/components/Map/search_bar';
import MapCarousel from '@/components/Map/carousel';
import ToolCard from '@/components/Safety_tools/tools_card';
import { useTracking } from '@/context/TrackProvider';
import { useEmergencyListener } from '@/hooks/useEmergencyListener';
import EmergencyList from '@/components/Emergency/EmergencyList';
import EmergencyInfoModal from '@/components/Emergency/EmergencyInfoModal';
import { useAuth } from '@/context/AuthProvider';

const { width: screenWidth } = Dimensions.get('window');

const CARD_WIDTH = screenWidth * 0.8;
const SPACING = screenWidth * 0.03;
const SIDE_PADDING = (screenWidth - CARD_WIDTH) / 2;
const SNAP_INTERVAL = CARD_WIDTH + SPACING;

export default function Map() {
  const [location, setLocation] = useState({
    latitude: 23,
    longitude: 120.2,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const { trackingModes, isTracking, trackingModeId, isReportDue } = useTracking();
  const { emergencyData: emergencies } = useEmergencyListener();
  const [showToolCard, setShowToolCard] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);

  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);


  const auth = useAuth();
  const currentUserId = auth.currentUser?.uid;

  const styles = createStyles();

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
      }
    })();
  }, []);

  useEffect(() => {
    // When a specific emergency is selected, focus on it
    if (selectedEmergency && mapRef.current) {
      const newRegion = {
        latitude: selectedEmergency.lat,
        longitude: selectedEmergency.long,
        latitudeDelta: 0.01, // Zoom level
        longitudeDelta: 0.01, // Zoom level
      };
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  }, [selectedEmergency]);

  useEffect(() => {
    // When the list of emergencies first appears, focus on the first one
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

  let carouselData: any[] = [{ id: 'search', component: <SearchBar /> }];

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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={location}
        showsUserLocation={true}
        mapType="standard"
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

      {/* Toggle Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowToolCard(prev => !prev)}
      >
        <Text style={styles.toggleButtonText}>
          {showToolCard ? 'Show Modes' : 'Show Tools'}
        </Text>
      </TouchableOpacity>

      {/* Recenter Button */}
      <Pressable style={styles.recenterButton} onPress={recenterMap}>
        <Text style={styles.recenterButtonText}>🎯</Text>
      </Pressable>

      {/* Don't show carousel if there is an emergency */}
      {!showToolCard && <MapCarousel data={carouselData} />}

      {showToolCard && <ToolCard showBottomBar={true} />}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
    },
    map: {
      width: '100%',
      height: '100%',
    },
    toggleButton: {
      position: 'absolute',
      top: 70, // Adjust this for reachable height (avoid top bar)
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      zIndex: 999,
    },
    toggleButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: 'bold',
    },
    recenterButton: {
      position: 'absolute',
      bottom: 250, // Adjust to be above the carousel
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
    },
    recenterButtonText: {
      fontSize: 24,
    },
  });
}
