import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import { addDoc, collection, doc, setDoc } from 'firebase/firestore'

import * as Location from 'expo-location'
import { db } from '@/libs/firebase'
import { useAuth } from '@/context/AuthProvider'


const Test = () => {

    const [location, setLocation] = useState({})
    const { user } = useAuth()
    const handleEmergencyPress = async () => {
        // TODO: Implement location sharing functionality
        console.log(user)
        try {
            await addDoc(collection(db, "emergency_location"), {
                sender: user?.id,
                receiver: user?.contact,
                location: location,
            });
        }catch(err){
            console.log(err)
        }finally{
            console.log(location)
        }
    }

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
      
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      })

    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Contact</Text>
      <TouchableOpacity 
        style={styles.emergencyButton}
        onPress={handleEmergencyPress}
      >
        <Text style={styles.buttonText}>
          Send Your Location to Emergency Contact
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export default Test

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
})