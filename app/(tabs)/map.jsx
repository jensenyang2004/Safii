// import React from 'react';
// import MapView from 'react-native-maps';
// import { StyleSheet, View } from 'react-native';

// export default function App() {
//   return (
//     <View style={styles.container}>
//       <MapView style={styles.map} />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   map: {
//     width: '100%',
//     height: '100%',
//   },
// });



import { View, Text, StyleSheet, Platform, Alert, TouchableOpacity, Button } from 'react-native'
import React, { useEffect, useState } from 'react'

import MapView, { Marker, Polyline } from 'react-native-maps'
// import Geolocation from '@react-native-community/geolocation'

import * as Location from 'expo-location'
// import MaterialIcons from '@expo/vector-iconrs/MaterialIcons'
import { getDistance } from 'geolib'
// import MapViewStyle from './../Utils/MapViewStyle.json'


// const App = () => {
export default function App() {

  // const [location, setLocation] = useState('')
  const [location, setLocation] = useState({})
  const [source, setSource] = useState(null)
  const [destination, setDestination] = useState(null)
  const [isChoosingSource, setIsChoosingSource] = useState(false)
  const [isChoosingDestination, setIsChoosingDestination] = useState(false)

  const defaultLocation={
    latitude: 23,
    longitude: 120.2,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }

  useEffect(() => {
    (async () =>{
      let {status} = await Location.requestForegroundPermissionsAsync()

      if (status == 'granted') {

        console.log('Permission successful!')

      } else {

        console.log('Permission not granted')
      }

      let location = await Location.getCurrentPositionAsync()
      // console.log(location)
      // setLocation(location)
      
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      })
      console.log(location)
      // setLocation(location)

    })();
  }, []);

  const showCoordinates = () => {
    if (source && destination) {
      console.log(source, destination);
      const distance = 
        getDistance(
          { latitude: source.latitude, longitude: source.longitude },
          { latitude: destination.latitude, longitude: destination.longitude },
        ) / 1000;
      Alert.alert(
        'Coordinates and Distance',
        `Source: \nLatitude: ${source.latitude}, Longitude: ${source.longitude}\n\nDestination: \nLatitude: ${destination.latitude}, Longitude: ${destination.longitude}\n\nDistance between source and destination: ${distance.toFixed(2,)} kilometers`
      );
      console.log(distance);
    } else {
      Alert.alert(
        'Error',
        'Please select both source and destination coordinates.',
      );
    }

  };

  const handleMapPress = (e) => {
    const coordinates = e.nativeEvent.coordinate;
    console.log(coordinates);

    if(isChoosingSource){
      setSource(coordinates);
      setIsChoosingSource(false);
    } else if (isChoosingDestination) {
      setDestination(coordinates);
      setIsChoosingDestination(false);
    }
  };

  const styles = createStyles();

  return (
    
    <View style={styles.container }  > 

      {/* <TouchableOpacity style={styles.location} onPress={setLocation}>
        <Text>
          <MaterialIcons name="my-location" size={24} color="white"/>
        </Text>
      </TouchableOpacity> */}

      <Text>{JSON.stringify(location)}</Text>

        <MapView
          style={styles.map}
          // customMapStyle={MapViewStyle}
          // provider={MapView.PROVIDER_GOOGLE}
          region={location}
          onRegionChangeComplete={data => console.log(data)}
          // show the blue dot
          showsUserLocation={true}
          onPress={handleMapPress}

          // zoomEnabled={true}
          // followsUserLocation={true}
          // showsMyLocationButton={true}
          mapType="standard"
          // mapType="satellite"
        >
          {location && (
            <Marker 
              coordinate={location} 
              title={'Testing'} 
              onPress={data => console.log(data.nativeEvent.coordinate)}
              // description={marker.description}
            />
          )}
          {source && (
            <Marker coordinate={source} title={'Source'} pinColor={'green'} draggable={true} onDragEnd={e => setSource(e.nativeEvent.coordinate)}/>
          )}
          {destination && (
            <Marker coordinate={destination} title={'Destination'} pinColor={'blue'} draggable={true} onDragEnd={e => setDestination(e.nativeEvent.coordinate)} />
          )}
          {source && destination && (
            <Polyline coordinates={[source, destination]} 
              strokeColor='#000'
              strokeWidth={2}
            />
          )}

        </MapView>
        <View style={styles.buttonContainer}>
          <View style={styles.buttonGroup}>
            {source ? (
              <Button title="Remove Source" onPress={() => setSource(null)}/>
            ) : (
              <Button
                // style={styles.button}
                title={
                  isChoosingSource ? 'Please Choose Source' : 'Choose Source'
                }
                onPress={() => setIsChoosingSource(true)}
              />
            )}
            
            {destination ? (
              <Button title="Remove Destination" onPress={() => setDestination(null)}/>
            ) : (
              <Button
                title={
                  isChoosingDestination ? 'Please Choose Destination' : 'Choose Destination'
                }
                onPress={() => setIsChoosingDestination(true)}
              />
            )}
            
          </View>
          <Button title="Show Coordinates" onPress={showCoordinates}/>
        </View>
    </View>
  )
}

function createStyles() {
  return StyleSheet.create({
// const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center'
  },
  // map: {
  //   ...StyleSheet.absoluteFillObject,
  // },
  map: {
    width: '100%',
    height: '100%',
  },
  button: {
    backgroundColor: 'blue',
    margin: 10
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  location: {
    position: "absolute",
    zIndex: 50,
    bottom: 0,
    right: 0,
    margin: 20,
    backgroundColor: "black",
    height: 50,
    width: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
    elevation: 10,
  },
})
}

// import { View, Text } from 'react-native'
// import React from 'react'

// export default function map() {
//   return (
//     <View>
//       <Text>Map</Text>
//     </View>
//   )
// }