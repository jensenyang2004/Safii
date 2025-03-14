import { View, Text, StyleSheet, Platform } from 'react-native';

import { useEffect } from 'react';
import { router, useNavigation, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';

export default function HomeScreen() {
  const { user, loading } = useAuth()
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if(!user){
      if(!rootNavigationState?.key){
        //do nothing 
      }else{
        router.replace('/(auth)/sign-in')
      }
    }
  }, [user])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Page</Text>
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
