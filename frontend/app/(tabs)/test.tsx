import { StyleSheet, Text, View, TouchableOpacity, Switch, Platform, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import { addDoc, collection, doc, setDoc, query, where, getDocs, updateDoc } from 'firebase/firestore'
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';


import * as Location from 'expo-location'
import { db } from '@/libs/firebase'
import { useAuth } from '@/context/AuthProvider'


const Test = () => {
    const [watchId, setWatchId] = useState<number | null>(null);
    const [location, setLocation] = useState({})
    const { user } = useAuth()
    const BACKGROUND_LOCATION_TASK = 'background-location-task';

    // Request background permissions
    const requestBackgroundPermissions = async () => {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          "Permission Required",
          "Background location access is required for emergency tracking",
          [{ text: "OK" }]
        );
        return false;
      }
      return true;
    };

    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error(error);
        return;
      }

      const hasPermission = await requestBackgroundPermissions();
      if (!hasPermission) {
        console.error("No background permission");
        return;
      }
      if (data) {
        const { locations } = data;
        // Upload location to Firebase
        const { latitude, longitude } = locations[0].coords;
        setLocation({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        await uploadLocation();
      }
    });

    const startTracking = async () => {
      try {
        // Request permissions
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (foregroundStatus !== 'granted' || backgroundStatus !== 'granted') {
          Alert.alert("Permission Denied", "Both foreground and background location permissions are required");
          return;
        }
    
        // Check if task is already running
        const hasTask = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (!hasTask) {
          // Start background location updates
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "Location Tracking",
              notificationBody: "Tracking location in background",
            },
          });
        }
      } catch (error) {
        console.error("Error starting location updates:", error);
      }
    };

    const stopTracking = async () => {
      try {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        setLocation({});
      } catch (error) {
        console.error("Error stopping location updates:", error);
      }
    };

    const uploadLocation = async() => {
      try {
        console.log("Uploading location...")
        const emergencyLocationRef = collection(db, "emergency_location");
        const q = query(emergencyLocationRef, where("sender", "==", user?.id), where("status", "==", "on"));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (document) => {
          await updateDoc(doc(db, "emergency_location", document.id), {
            location: location
          });
        });
      } catch (error) {
        console.error("Error uploading emergency location:", error);
      } finally {
        // console.log("Emergency status updated successfully");
      }
    }

    const handleEmergencyPress = async () => {
        // TODO: Implement location sharing functionality
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
      startTracking();
    }else{
      // TODO: Stop sharing location
      stopTracking();
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