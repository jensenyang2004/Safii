// app/(tabs)/home.tsx
import { ActivityIndicator, View, Text, Pressable, Alert, StyleSheet, Image } from 'react-native';

import { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import '@/global.css';
// import ProfilePhotoUploader from '@/components/ProfilePhotoUploader';

// 1. Import your fake-call hook
import { useFakePhoneCall } from '../features/fakePhoneCallPlayer/hooks/useFakePhoneCall';


export default function HomeScreen() {
  const { user, loading, signOut } = useAuth();

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

  // useEffect(() => {
  //   if (user) {
  //     console.log('User ID:', user.uid);
  //     console.log('Username:', user.username);
  //     console.log('Email:', user.email);
  //     console.log('Avatar URL:', user.avatarUrl);
  //     console.log('All properties:', Object.keys(user));
  //   } else {
  //     console.log('User is null or undefined');
  //   }
  // }, [user]);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => { }}>
        {user?.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarPlaceholderText}>
              {user?.displayName?.[0] || user?.username?.[0] || 'U'}
            </Text>
          </View>
        )}
      </Pressable>

      <Text style={styles.username}>
        {user?.displayName || user?.username || user?.nickname || user?.email || 'Unknown User'}
      </Text>

      {/* <ProfilePhotoUploader /> */}

      {loading ? (
        <ActivityIndicator size="large" color="#1E40AF" />
      ) : (
        <Pressable
          onPress={signOut}
          style={[styles.signOutButton, loading && styles.disabledButton]}
          disabled={loading}
        >
          <Text style={styles.signOutText}>
            Sign Out
          </Text>
        </Pressable>
      )}
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
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#1E40AF',
  },
  avatarPlaceholder: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1E40AF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
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
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#8B9AC0', // Lighter blue for disabled state
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