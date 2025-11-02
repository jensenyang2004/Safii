import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Theme from '../../constants/Theme';

const FirebaseTestScreen = () => {
  const handleCallPress = () => {
    // router.push('/(modals)/websocket_calling');
    router.push('/(modals)/openai_call');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Firebase Live Call Test</Text>
        <Text style={styles.subtitle}>Press the button to start a live audio conversation with Gemini.</Text>
      </View>

      <TouchableOpacity
        style={styles.callButton}
        onPress={handleCallPress}
      >
        <FontAwesome name="phone" size={40} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 150, // Add padding to avoid overlap with the button
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  callButton: {
    position: 'absolute',
    bottom: 180,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.actionOrange,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

export default FirebaseTestScreen;
