import { StyleSheet, Text, View, TouchableOpacity, Switch } from 'react-native'
import React, { useEffect, useState } from 'react'
import { addDoc, collection, doc, setDoc, query, where, getDocs, updateDoc } from 'firebase/firestore'

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
                status: "on"
            });
        }catch(err){
            console.log(err)
        }finally{
            console.log("Emergency location shared successfully")
            console.log(location)
        }
    }

    const handleEmergencyDismiss = async () => {
      console.log(user);
      try {
        const emergencyLocationRef = collection(db, "emergency_location");
        const q = query(emergencyLocationRef, where("sender", "==", user?.id));
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (document) => {
          await updateDoc(doc(db, "emergency_location", document.id), {
            status: "off"
          });
        });
      } catch (error) {
        console.error("Error updating emergency status:", error);
      } finally {
        console.log("Emergency status updated successfully");
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
        // console.log('Permission successful!')
      } else {

        // console.log('Permission not granted')
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

  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => {
    setIsEnabled(previousState => !previousState);
    if (!isEnabled) {
      handleEmergencyPress();
    }else{
      // TODO: Stop sharing location
      handleEmergencyDismiss();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>In Danger Mode</Text>
      <View style={styles.switchContainer}>
        <Switch
          trackColor={{ false: '#767577', true: '#FF3B30' }}
          thumbColor={isEnabled ? '#f4f3f4' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleSwitch}
          value={isEnabled}
          style={{ transform: [{ scaleX: 2 }, { scaleY: 2 }] }}
        />
        <Text style={styles.switchText}>
          {isEnabled ? 'Emergency Mode ON' : 'Emergency Mode OFF'}
        </Text>
      </View>
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
  },
  switchContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 20,
  },
  switchText: {
    marginTop: 30,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30'
  }
})