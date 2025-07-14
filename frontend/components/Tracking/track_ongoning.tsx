import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CARD_WIDTH = 320;

const Card_ongoing = () => {
  return (
    <View style={styles.card}>
      {/* Ad Area inside container */}
      <View style={styles.adContainer}>
        {/* Ad content goes here */}
      </View>
      {/* Info Row */}
      <View style={styles.infoRow}>
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>正在進行下班模式...</Text>
        </View>
        <Text style={styles.timeText}>3 分鐘</Text>
        <TouchableOpacity style={styles.iconBox}>
          <Ionicons name="location-sharp" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    padding: 0,
    overflow: 'hidden',
  },
  adContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#e6eaf3', // Placeholder color
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#f7f7f7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  statusBox: {
    flex: 1,
    backgroundColor: '#b6c7d6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  statusText: {
    color: '#5a6b7b',
    fontSize: 16,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 16,
    color: '#5a6b7b',
    marginRight: 12,
    fontWeight: '600',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a3e5c',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Card_ongoing;