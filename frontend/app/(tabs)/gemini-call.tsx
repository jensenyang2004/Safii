
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, SafeAreaView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

const contacts = [
  { id: '1', name: 'Mike', image: require('../../assets/avatar-photo/mike.jpg') },
  { id: '2', name: 'Cindy', image: require('../../assets/avatar-photo/alice.jpg') },
  { id: '3', name: 'Bob', image: require('../../assets/avatar-photo/bob.jpg') },
];

const GeminiCallScreen = () => {
  const [selectedContact, setSelectedContact] = useState(null);

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
  };

  const handleCallPress = () => {
    if (selectedContact) {
      router.push({ pathname: '/(modals)/calling', params: { contact: selectedContact.name } });
    }
  };

  const renderContactItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.contactItem, selectedContact?.id === item.id && styles.selectedContact]}
      onPress={() => handleSelectContact(item)}
    >
      <Image source={item.image} style={styles.contactImage} />
      <Text style={styles.contactName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Select a contact to call</Text>
      <FlatList
        data={contacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.id}
        style={styles.contactList}
      />
      <TouchableOpacity 
        style={[styles.callButton, !selectedContact && styles.disabledButton]}
        onPress={handleCallPress} 
        disabled={!selectedContact}
      >
        <FontAwesome name="phone" size={40} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  contactList: {
    width: '100%',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedContact: {
    backgroundColor: '#e0e0e0',
  },
  contactImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  contactName: {
    fontSize: 18,
  },
  callButton: {
    position: 'absolute',
    bottom: 100, // Adjust this value to position the button above the tab bar
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
  },
});

export default GeminiCallScreen;
