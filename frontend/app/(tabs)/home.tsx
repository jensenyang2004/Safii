import { View, Text, StyleSheet, Platform, Pressable, Alert } from 'react-native';

import { useEffect } from 'react';
import { router, useNavigation, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';

export default function HomeScreen() {
  const { user, loading, signOut } = useAuth()
  const rootNavigationState = useRootNavigationState();

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert("Signed out successfully!");
      router.replace('/(auth)/sign-in') // replace with the desired route
    } catch (error) {
      console.error("Error signing out: ", error);
      // Alert.alert("Error signing out: ", error.message);
    }
  };

  useEffect(() => {
    if(!user){
      if(!rootNavigationState?.key){
        //do nothing 
      }else{
        // router.replace('/(auth)/signIn')
      }
    }
  }, [user])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user?.username}</Text>
      <Pressable 
        onPress={handleSignOut} 
        style={({ pressed }) => [
          {
            backgroundColor: pressed ? 'gray' : '#1e90ff', 
            padding: 10, 
            borderRadius: 5

          }
        ]}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
