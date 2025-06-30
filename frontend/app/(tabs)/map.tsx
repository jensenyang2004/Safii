import { View, Text, StyleSheet } from 'react-native'
import React, { useEffect, useState } from 'react'
import MapView from 'react-native-maps'
import * as Location from 'expo-location'

export default function Map() {
  const [location, setLocation] = useState({})

  const defaultLocation = {
    latitude: 23,
    longitude: 120.2,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync()

      if (status == 'granted') {
        console.log('Permission successful!')
      } else {
        console.log('Permission not granted')
      }

      let location = await Location.getCurrentPositionAsync()
      
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      })
      console.log(location)

    })();
  }, []);

  const styles = createStyles();

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={location}
        onRegionChangeComplete={data => console.log(data)}
        showsUserLocation={true}
        mapType="standard"
      />
    </View>
  )
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
  })
}