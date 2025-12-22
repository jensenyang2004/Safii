
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, SafeAreaView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Theme from '../../constants/Theme';

// The single contact to be displayed and called.
const contact = {
  id: '1',
  name: 'Keanu',
  image: require('../../assets/avatar-photo/keanu.jpg'),
};

const GeminiCallScreen = () => {
  const handleCallPress = () => {
    // Directly navigate to the calling screen with the hardcoded contact's info.
    router.push({ pathname: '/(modals)/calling', params: { contact: contact.name } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your AI Companion</Text>
        <Text style={styles.subtitle}>Press the button to start a call</Text>
        
        <Image source={contact.image} style={styles.profileImage} />
        <Text style={styles.profileName}>{contact.name}</Text>
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
    paddingBottom: 150, // Add padding to avoid overlap with the button
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  profileImage: {
    width: 200, // Larger image
    height: 200,
    borderRadius: 100, // Make it a circle
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
  },
  callButton: {
    position: 'absolute',
    bottom: 180, // Moved up from 100
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

export default GeminiCallScreen;
