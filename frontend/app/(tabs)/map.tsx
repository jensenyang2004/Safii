import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Text,
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import MapView from 'react-native-maps';
import {
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
} from 'expo-location';
import TrackModeCard from '@/components/Tracking/track_base';
import SearchBar from '@/components/Map/search_bar';
import MapCarousel from '@/components/Map/carousel';
import ToolCard from '@/components/Safety_tools/tools_card';
import { useTracking } from '@/context/TrackProvider';

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

  const { trackingModes, loading } = useTracking();
  const [showToolCard, setShowToolCard] = useState(false); // toggle state

  const flatListRef = useRef<FlatList>(null);

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

  const styles = createStyles();

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={location}
        showsUserLocation={true}
        mapType="standard"
      />

      {/* Toggle Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowToolCard(prev => !prev)}
      >
        <Text style={styles.toggleButtonText}>
          {showToolCard ? 'Show Modes' : 'Show Tools'}
        </Text>
      </TouchableOpacity>

      {/* Conditional rendering */}
      {showToolCard ? (
        <ToolCard showBottomBar={true} />
      ) : (
        <MapCarousel
          data={[
            { id: 'search', component: <SearchBar /> },
            ...(trackingModes ?? []).map((mode: any) => ({
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
            })),
          ]}
        />
      )}
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
      top: 60, // Adjust this for reachable height (avoid top bar)
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
  });
}