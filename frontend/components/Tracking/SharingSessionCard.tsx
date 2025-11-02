import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, FlatList } from 'react-native';
import { useSharingSessions } from '@/hooks/useSharingSessions';
import * as Theme from '@/constants/Theme';
import { FontAwesome } from '@expo/vector-icons';
import {
  enableBioMetric,
  checkBiometricSupport,
  checkNewFingerPrintAdded,
} from 'react-native-biometric-check';

export default function SharingSessionCard() {
  const { sessions, isLoading, error } = useSharingSessions();

  const handleStopSharing = (sessionId: string, contactId: string) => {
    // TODO: Implement stop sharing logic
  enableBioMetric(
      'Use Face ID', // Title
      'Authenticate to proceed', // Subtitle
      (res) => {
        // The success code for iOS is 5
        if (res === 5) {
          console.log("FaceID verify successfully");
        } else {
          console.log("FaceID verify failed");
        }
      }
    );
    console.log(`Stop sharing with contact ${contactId} in session ${sessionId}`);
  };

  const renderContact = ({ item }: { item: { sessionId: string, contactId: string, username?: string, avatarUrl?: string } }) => (
    <View style={styles.contactContainer}>
      <Image source={{ uri: item.avatarUrl || undefined }} style={styles.avatar} />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.username || 'Unknown User'}</Text>
        <View style={styles.sharingStatus}>
          <FontAwesome name="circle" size={12} color={'green'} />
          <Text style={styles.sharingText}>Sharing</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.stopButton} 
        onPress={() => handleStopSharing(item.sessionId, item.contactId)}>
        <Text style={styles.stopButtonText}>Stop Sharing</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (error) {
    return <Text>{error}</Text>;
  }

  const allContacts = sessions.flatMap(session => 
    Object.entries(session.contactStatus).map(([contactId, contactData]) => ({
      sessionId: session.emergencyDocId,
      contactId,
      ...contactData
    }))
  );

  if (allContacts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { textAlign: 'center' }]}>您的位置並未分享給任何人</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
        <FlatList
            data={allContacts}
            renderItem={renderContact}
            keyExtractor={item => item.contactId}
            ListHeaderComponent={() => <Text style={styles.title}>位置正在被分享</Text>}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radii.xl,
    padding: 0,
    margin: 10,
    height: '87%',
    shadowColor: Theme.colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: Theme.typography.fontSizes.h4,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray75,
    paddingHorizontal: Theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Theme.radii.full,
    marginRight: Theme.spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: Theme.typography.fontSizes.body,
    fontWeight: Theme.typography.fontWeights.medium,
    color: Theme.colors.textPrimary,
  },
  sharingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
  },
  sharingText: {
    marginLeft: Theme.spacing.xs,
    fontSize: Theme.typography.fontSizes.caption,
    color: Theme.colors.textSecondary,
  },
  stopButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radii.md,
  },
  stopButtonText: {
    color: Theme.colors.white,
    fontWeight: Theme.typography.fontWeights.bold,
  },
});
