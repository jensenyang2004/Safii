import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const CARD_WIDTH = width * 0.9;

<<<<<<< HEAD
const ToolCard = ({ showBottomBar = true, onFindSafeSpot }) => {
  const items = ['求助', '假電話', '警報聲', '尋找安全地點'];
=======
const ToolCard = ({ showBottomBar = true }) => {
  const items = ['求助', '假電話', '警報聲'];
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
  const [currentIndex, setCurrentIndex] = useState(0);
  return (
    <View style={styles.toolCardWrapper}>
      <View style={styles.container}>
        <View style={styles.chevronWrapper}>
          <Ionicons name="chevron-down" size={24} color="black" />
        </View>

        <Carousel
          width={CARD_WIDTH}
          height={220}
          data={items}
          scrollAnimationDuration={500}
          onSnapToItem={index => setCurrentIndex(index)}
<<<<<<< HEAD
          renderItem={({ item }) => {
            const handlePress = () => {
              if (item === '尋找安全地點') {
                onFindSafeSpot();
              } else {
                console.log(`${item} pressed`);
              }
            };
            return (
              <TouchableOpacity style={styles.circleButton} onPress={handlePress}>
                <Text style={styles.circleText}>{item}</Text>
              </TouchableOpacity>
            )
          }}
=======
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.circleButton}>
              <Text style={styles.circleText}>{item}</Text>
            </TouchableOpacity>
          )}
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
        />

        {showBottomBar && (
          <View style={styles.bottomBar}>
            <Text style={styles.statusText}>正在進行下班模式...</Text>
            <View style={styles.icons}>
              <Ionicons name="alarm" size={20} color="black" />
              <Ionicons name="location" size={20} color="black" style={{ marginLeft: 12 }} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default ToolCard;

const styles = StyleSheet.create({
  toolCardWrapper: {
<<<<<<< HEAD
    width: '100%',
    alignItems: 'center',
=======
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
>>>>>>> c97b2e0e53ce9bf53b1fc2a3056936d2f561a642
  },
  container: {
    width: CARD_WIDTH,
    borderRadius: 20,
    backgroundColor: '#FAF3EF',
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  chevronWrapper: {
    marginBottom: 10,
  },
  circleButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#141C38',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  circleText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F2',
    marginTop: 25,
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
  },
  statusText: {
    color: '#141C38',
    fontSize: 14,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});