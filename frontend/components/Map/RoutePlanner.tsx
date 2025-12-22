// frontend/components/Map/RoutePlanner.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { useRoutePlanner } from '../../hooks/useRoutePlanner';
import RouteCarousel from './RouteCarousel';
import { RouteInfo } from '../../types';
import { decodePolyline } from '../../utils/polyline';
import { BlurView } from 'expo-blur';

interface RoutePlannerProps {
  userLocation: { latitude: number; longitude: number };
  mapRef: React.RefObject<MapView>;
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({ userLocation, mapRef }) => {
  const [destination, setDestination] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | null>(null);
  const { routes, error, getRoutes } = useRoutePlanner();

  const handleSearch = () => {
    if (destination && userLocation) {
      getRoutes(userLocation, destination);
    }
  };

  useEffect(() => {
    if (routes.length > 0) {
      const safestRoute = routes.find(r => r.mode === 'safest') || routes[0];
      setSelectedRoute(safestRoute);
    }
  }, [routes]);

  useEffect(() => {
    if (selectedRoute && mapRef.current && userLocation) {
      const decodedPolyline = decodePolyline(selectedRoute.polyline);
      const coordinates = [
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        ...decodedPolyline,
      ];
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 150, right: 50, bottom: 350, left: 50 },
        animated: true,
      });
    }
  }, [selectedRoute, userLocation, mapRef]);

  const getRouteColor = (mode: string) => {
    if (mode === 'fastest') return 'blue';
    if (mode === 'shortest') return 'gray';
    if (mode === 'safest') return 'green';
    return 'black';
  };

  return (
    <View style={styles.fullScreenContainer}>
      <View style={styles.searchContainer}>
        <BlurView intensity={90} tint="light" style={styles.blurView}>
          <View style={styles.searchInnerContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter destination"
              value={destination}
              onChangeText={setDestination}
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {routes.map(route => (
        <Polyline
          key={route.polyline}
          coordinates={decodePolyline(route.polyline)}
          strokeColor={getRouteColor(route.mode)}
          strokeWidth={selectedRoute?.polyline === route.polyline ? 6 : 3}
          onPress={() => setSelectedRoute(route)}
          tappable
        />
      ))}

      {routes.length > 0 && (
        <RouteCarousel
          routes={routes}
          selectedRoute={selectedRoute}
          onSelectRoute={setSelectedRoute}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  searchContainer: {
    position: 'absolute',
    top: 60,
    width: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  blurView: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  searchInnerContainer: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    padding: 15,
  },
  searchButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    position: 'absolute',
    top: 120,
    color: 'red',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
  },
});

export default RoutePlanner;
