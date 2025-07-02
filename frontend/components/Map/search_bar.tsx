import React from 'react';
import { View, TextInput, StyleSheet, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const storedPlaces = [
  { label: '住家', address: '台北市大安區建國南路二段' },
  { label: '系辦', address: '台北市大安區舟山路' },
  { label: '租屋處', address: '台北市大安區建國南路二段' },
];

const SearchBarWithPlaces = () => {
  return (
    <View style={styles.outerContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={24} color="#757575" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="搜尋想去的地方"
          placeholderTextColor="#757575"
        />
      </View>
      <View style={styles.placesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {storedPlaces.map((place, idx) => (
            <View key={idx} style={styles.placeBlock}>
              <Text style={styles.placeLabel}>{place.label}</Text>
              <Text style={styles.placeAddress}>{place.address}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: '#FAF3EF',
    borderRadius: 20,
    padding: 16,
    width: '100%', // Adjust as needed
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '95%',
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  placesContainer: {
    flexDirection: 'row',
  },
  placeBlock: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    alignItems: 'flex-start',
    minWidth: 90,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  placeLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#444',
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 12,
    color: '#888',
  },
});

export default SearchBarWithPlaces;