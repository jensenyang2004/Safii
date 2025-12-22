import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Theme from '@/constants/Theme';
export interface EmergencyBubbleProps {
  emergency: any;
  onPress: () => void;
}

export const EmergencyBubble: React.FC<EmergencyBubbleProps> = ({ emergency, onPress }) => {
  return (
    <Pressable style={styles.bubble} onPress={onPress}>
      <MaterialIcons name="warning" size={24} color="white" />
      <Text style={styles.bubbleText}>{emergency.trackedUserName}</Text>
    </Pressable>
  );
};

interface EmergencyBubblesProps {
  emergencies: any[];
  onSelectEmergency: (emergency: any) => void;
}

const EmergencyBubbles: React.FC<EmergencyBubblesProps> = ({ emergencies, onSelectEmergency }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {emergencies.map(emergency => (
        <EmergencyBubble
          key={emergency.emergencyDocId}
          emergency={emergency}
          onPress={() => onSelectEmergency(emergency)}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubble: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.danger,
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  bubbleText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default EmergencyBubbles;
