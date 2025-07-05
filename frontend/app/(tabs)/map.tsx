import { View, StyleSheet, Dimensions, FlatList } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import TrackModeCard from '@/components/Tracking/track_base';
import Card_ongoing from '@/components/Tracking/track_ongoning';
import SearchBar from '@/components/Map/search_bar';
import MapCarousel from '@/components/Map/carousel';
import { db } from '@/libs/firebase';
import { collection, getDocs } from '@firebase/firestore';
import { useTracking } from '@/context/TrackProvider';
import BackgroundTask from 'react-native-background-task';
import { AppState } from 'react-native';


const { width: screenWidth } = Dimensions.get('window');

const CARD_WIDTH = screenWidth * 0.80;
const SPACING = screenWidth*0.03;
const SIDE_PADDING = (screenWidth - CARD_WIDTH) / 2;
const SNAP_INTERVAL = CARD_WIDTH + SPACING;


const data = [1, 2, 3, 4, 5]; // sample data

export default function Map() {
  const [location, setLocation] = useState({
    latitude: 23,
    longitude: 120.2,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const { trackingModes, loading } = useTracking();

  const flatListRef = useRef<FlatList>(null);


  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let currentLocation = await Location.getCurrentPositionAsync();
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
              />
            ),
          })),
        ]}
      />


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
    carouselContainer: {
      position: 'absolute',
      bottom: '13%',
    },
  });
}