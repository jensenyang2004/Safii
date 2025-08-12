import { View, Text, StyleSheet, Platform, Alert, TouchableOpacity, Button, Image } from 'react-native'
import React, { useEffect, useState } from 'react'

import MapView, { Callout, Marker, Polyline } from 'react-native-maps'
// import * as Location from 'expo-location'
import { getDistance } from 'geolib'

import { collection, doc, limit, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from '@/libs/firebase'
import { useAuth } from '@/context/AuthProvider'
import { Circle } from 'react-native-maps';
// import Icon from 'react-native-vector-icons/FontAwesome';

export default function map_tracking() {
  const { user } = useAuth();

  const [location, setLocation] = useState(null)
  const [source, setSource] = useState(null)
  const [destination, setDestination] = useState(null)
  const [isChoosingSource, setIsChoosingSource] = useState(false)
  const [isChoosingDestination, setIsChoosingDestination] = useState(false)

  const defaultLocation = {
    latitude: 23,
    longitude: 120.2,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }

  // Listen for emergency location updates from Firebase
  useEffect(() => {
    if (!user?.uid) return;

    console.log("Setting up Firebase listener for user:", user.uid);
    
    const emergencyLocationRef = collection(db, 'emergency_location');
    const q = query(
      emergencyLocationRef,
      where('receiver', '==', user.uid),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          console.log("Received location data:", docData.location);
          
          // Use the location data directly since it already has the correct format
          if (docData.location && 
              typeof docData.location.latitude === 'number' && 
              typeof docData.location.longitude === 'number') {
            
            setLocation(docData.location);
            console.log("Location updated from Firebase:", docData.location);
          } else {
            console.log("Invalid location format in Firebase:", docData.location);
          }
        } else {
          console.log("No emergency location documents found for this user");
        }
      },
      (err) => {
        console.log("Error in Firebase listener:", err.message);
      }
    );

    return () => {
      console.log("Cleaning up Firebase listener");
      unsubscribe();
    };
  }, [user]);

  const styles = createStyles();

  return (
    <View style={styles.container}>
      <View style={styles.debugPanel}>
        <Text style={styles.debugText}>
          Location: {location ? `Lat: ${location.latitude.toFixed(4)}, Long: ${location.longitude.toFixed(4)}` : 'Loading...'}
        </Text>
      </View>

      {location ? (
        <MapView
          style={styles.map}
          initialRegion={location}
          region={location}
          showsUserLocation={true}
          mapType="standard"
        >
        <Marker
            coordinate={{ 
            latitude: location?.latitude, 
            longitude: location?.longitude 
            }}
            title={'Emergency Location'}
            description={'Person needing help'}
        >
            <View style={{ width: 35, height: 35 }}> {/* Adjust these values as needed */}
                <Image 
                source={require('@/assets/images/person.png')}
                style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                />
            </View>
            <Callout>
            <View>
                <Text>Emergency Contact</Text>
                <Text>Needs assistance</Text>
            </View>
            </Callout>
        </Marker>

          
          {source && (
            <Marker 
              coordinate={source} 
              title={'Source'} 
              pinColor={'green'} 
              draggable={true} 
              onDragEnd={e => setSource(e.nativeEvent.coordinate)}
            />
          )}
          
          
          {source && destination && (
            <Polyline 
              coordinates={[source, destination]} 
              strokeColor='#000'
              strokeWidth={2}
            />
          )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text>Loading map...</Text>
        </View>
      )}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center'
    },
    map: {
      width: '100%',
      height: '100%',
    },
    debugPanel: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: 10,
      zIndex: 1000,
      borderRadius: 5,
    },
    debugText: {
      fontSize: 12,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    }
  });
}