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

  const flatListRef = useRef<FlatList>(null);

  const [trackingModes, setTrackingModes] = useState<any[]>([]);

  useEffect(() => {
    const fetchTrackingModes = async () => {
      try {
        const colRef = collection(db, 'TrackingMode');
        const snapshot = await getDocs(colRef);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTrackingModes(data);
        console.log(data);
        // setTrackingModes(snapshot);
      } catch (error) {
        console.error('Error fetching Trackingmode:', error);
      }
    };

    fetchTrackingModes();
    // console.log(trackingModes)

    
  }, []);

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
          { id: 'search', component: <SearchBar/> },
          { id: 'track-1', component: <TrackModeCard id="1" name="off-work"           contacts={[
            { id: 'c1', name: 'Alice' },
            { id: 'c2', name: 'Bob' },
          ]}/> },
          // { id: 'track-2', component: <TrackModeCard /> },
          // more cards...
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