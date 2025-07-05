// app/(tabs)/home.tsx
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  Button,
} from 'react-native';
import { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import '@/global.css';

// 1. Import your fake-call hook
import { useFakePhoneCall } from '../features/fakePhoneCallPlayer/hooks/useFakePhoneCall';

function simulateCall() {
  // this pushes into your modal stack at /interactive-call
  router.push('/interactive-call');
}

export default function HomeScreen() {
  const { user, loading, signOut } = useAuth();
  const rootNavigationState = useRootNavigationState();

  // 2. Destructure the state+actions from the hook
  const {
    startFakeCall,
    incoming,
    answerCall,
    declineCall,
  } = useFakePhoneCall();

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert("Signed out successfully!");
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // comment the below for development use

  // useEffect(() => {
  //   if (!user && rootNavigationState?.key) {
  //     router.replace('/(auth)/sign-in');
  //   }
  // }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.username}>{user?.username}</Text>

      <Pressable onPress={handleSignOut} style={styles.signOutButton}>
        {({ pressed }) => (
          <Text style={[styles.signOutText, pressed && styles.pressed]}>
            Sign Out
          </Text>
        )}
      </Pressable>

      {/* <Pressable onPress={() => router.push('/interactive-call')} style={styles.callButton}>
        <Text style={styles.callButtonText}>Simulate Phone Call</Text>
      </Pressable>

      {incoming && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Incoming Call…</Text>
          <View style={styles.overlayButtons}>
            <Button title="Answer" onPress={answerCall} color="#4CAF50" />
            <Button title="Decline" onPress={declineCall} color="#F44336" />
          </View>
        </View>
      )} */}
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  signOutButton: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 24,
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  callButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
  },
  callButtonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  overlayText: {
    color: 'white',
    fontSize: 28,
    marginBottom: 20,
  },
  overlayButtons: {
    flexDirection: 'row',
    width: '60%',
    justifyContent: 'space-between',
  },
});