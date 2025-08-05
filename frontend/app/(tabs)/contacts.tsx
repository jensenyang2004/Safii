
// app/(tabs)/contacts.tsx



// this is for video calls


import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import { callUser } from '@/app/features/videoCall/startCall';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mock user data - replace with your actual user data
const USERS = [
  { id: 'user1', name: 'John Doe', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', online: true },
  { id: 'user2', name: 'Jane Smith', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', online: true },
  { id: 'user3', name: 'Robert Johnson', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', online: false },
  { id: 'user4', name: 'Emily Davis', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', online: true },
  { id: 'user5', name: 'Michael Wilson', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', online: false },
];

interface User {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
}

export default function ContactsScreen() {
  // Track calling state
  const [callingUserId, setCallingUserId] = useState<string | null>(null);
  
  const startCall = async (userId: string, userName: string): Promise<void> => {
    setCallingUserId(userId);
    await callUser(userId, userName);
    setCallingUserId(null);
  };

  const renderContact = ({ item }: { item: User }) => (
    <Pressable 
      style={styles.contactRow}
      onPress={() => {}}
    >
      <View style={styles.contactInfo}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={item.online ? styles.statusOnline : styles.statusOffline}>
            {item.online ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      
      {callingUserId === item.id ? (
        <ActivityIndicator size="small" color="#4CAF50" />
      ) : (
        <Pressable 
          style={styles.callButton}
          onPress={() => startCall(item.id, item.name)}
          disabled={!item.online}
        >
          <Ionicons 
            name="videocam" 
            size={24} 
            color={item.online ? "#4CAF50" : "#AAAAAA"} 
          />
        </Pressable>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Contacts</Text>
      <FlatList
        data={USERS}
        renderItem={renderContact}
        keyExtractor={item => item.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusOnline: {
    fontSize: 12,
    color: '#4CAF50',
  },
  statusOffline: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  callButton: {
    padding: 8,
  }
});