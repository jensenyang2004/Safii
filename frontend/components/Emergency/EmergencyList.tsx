import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const EmergencyList = ({ emergencies, onSelectEmergency }) => {
  if (!emergencies || emergencies.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>進行中的求助訊息</Text>
      <FlatList
        data={emergencies}
        keyExtractor={(item) => item.emergencyDocId}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => onSelectEmergency(item)}>
            <Text style={styles.itemText}>{item.trackedUserName}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    left: 10,
    backgroundColor: '#F8F1EC',
    borderRadius: 20,
    padding: 20,
    width: 200,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    zIndex: 1000,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  item: {
    paddingVertical: 10,
  },
  itemText: {
    fontSize: 16,
    color: '#c0392b',
    fontWeight: 'bold',
  },
});

export default EmergencyList;