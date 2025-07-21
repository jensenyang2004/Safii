import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Animated, Easing } from 'react-native';
// import { useLiveActivity } from '@/hooks/useCountDown';
import { useTracking } from '@/context/TrackProvider';

type TrackModeCardProps = {
  id: string;
  name: string;
  contacts: { id: string; url: string; name: string }[];
};

const avatarImg = require('../../assets/images/person.png'); // Replace with your actual avatar image

export default function TrackModeCard({ id, name, contacts }: TrackModeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const { handleStartTracking, handleStopTracking, isTracking } = useTracking();
  // const { startActivity } = useLiveActivity();

  const handlePress = () => {
    setExpanded(!expanded);
    Animated.timing(animation, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const expandedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 120], // collapsed height, expanded height
  });

  // Show up to 3 avatars, rest are counted in "+N"
  const visibleContacts = contacts.slice(0, 3);
  const moreCount = contacts.length - visibleContacts.length;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => {
        if (isTracking) {
          handleStopTracking();
        } else {
          handleStartTracking(id)}
        }}
        activeOpacity={0.8}>
        <Text style={styles.headerText}>開起{name}模式</Text>
      </TouchableOpacity>
      <Animated.View style={[styles.bottom, { height: expandedHeight }]}>
        <TouchableOpacity style={styles.bottomContent} onPress={handlePress} activeOpacity={0.8}>
          <Text style={styles.notifyText}>緊急時將通知</Text>
          <View style={styles.avatarsRow}>
            {visibleContacts.map((contact) => (
              <Image key={contact.id} source={avatarImg} style={styles.avatar} />
            ))}
            {moreCount > 0 && (
              <View style={styles.moreCircle}>
                <Text style={styles.moreText}>{`+${moreCount}`}</Text>
              </View>
            )}
            <Text style={styles.arrow}>{'>'}</Text>
          </View>
          {expanded && (
            <View style={styles.expandedContent}>
              {contacts.map((contact) => (
                <Text key={contact.id} style={styles.expandedText}>
                  {contact.name}
                </Text>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F1EC',
    borderRadius: 20,
    padding: 0,
    margin: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: {
    backgroundColor: '#F18C8E',
    borderRadius: 16,
    margin: 8,
    marginBottom: 0,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F18C8E',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
    letterSpacing: 2,
  },
  bottom: {
    backgroundColor: '#F8F1EC',
    borderRadius: 16,
    margin: 8,
    marginTop: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bottomContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  notifyText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: -6,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#eee',
  },
  moreCircle: {
    backgroundColor: '#E5E5E5',
    borderRadius: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  moreText: {
    color: '#444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  arrow: {
    fontSize: 22,
    color: '#888',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: 10,
    alignItems: 'center',
  },
  expandedText: {
    color: '#888',
    fontSize: 14,
  },
});