import { getLiveGenerativeModel, startAudioConversation, ResponseModality } from "firebase/ai";
import { ai } from "@/libs/firebase";
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';
import * as Theme from '../../constants/Theme';
import { router } from "expo-router";

const FirebaseCallingScreen = () => {
  const [status, setStatus] = useState('Initializing...');
  const [isCalling, setIsCalling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let controller;

    const setupAndStartCall = async () => {
      try {
        setStatus('Requesting audio permissions...');
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
          throw new Error('Audio permission not granted. Please enable it in your device settings.');
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        setStatus('Initializing Gemini Live model...');
        const model = getLiveGenerativeModel(ai, {
          model: "gemini-2.0-flash-live-001",
          generationConfig: {
            responseModalities: [ResponseModality.AUDIO],
          },
        });

        setStatus('Connecting to the model...');
        const session = await model.connect();

        setStatus('Starting audio conversation...');
        controller = await startAudioConversation(session);
        
        setIsCalling(true);
        setStatus('Conversation active. Speak now!');

      } catch (err) {
        console.error("Error during call setup:", err);
        setError(err.message || 'An unknown error occurred.');
        setStatus('Error');
      }
    };

    setupAndStartCall();

    // Cleanup on component unmount
    return () => {
      if (controller) {
        controller.stop();
      }
      setIsCalling(false);
      setStatus('Call ended');
    };
  }, []);

  const handleEndCall = () => {
    if (router.canGoBack()) {
        router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>{status}</Text>
      
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : !isCalling && !error ? (
        <ActivityIndicator size="large" color={Theme.colors.actionOrange} />
      ) : null}

      {isCalling && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <FontAwesome name="phone" size={32} color="white" style={styles.hangupIcon} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e', // Dark background for a call screen
    padding: 20,
  },
  statusText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff453a', // iOS system red
    textAlign: 'center',
    marginBottom: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    alignItems: 'center',
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ff453a', // iOS system red
    justifyContent: 'center',
    alignItems: 'center',
  },
  hangupIcon: {
    transform: [{ rotate: '135deg' }],
  },
});

export default FirebaseCallingScreen;