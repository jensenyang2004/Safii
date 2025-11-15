import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { RouteInfo } from '../../types';

interface Props {
  routes: RouteInfo[];
  selectedRoute: RouteInfo | null;
  onSelectRoute: (route: RouteInfo) => void;
  onStartNavigation: (route: RouteInfo) => void;
}

const RouteCarousel: React.FC<Props> = ({ routes, selectedRoute, onSelectRoute, onStartNavigation }) => {
  const startGuidance = async (route: RouteInfo) => {
    console.log("Starting guidance for route:", route);

    const availableVoices = await Speech.getAvailableVoicesAsync();
    console.log("Available voices:", availableVoices);

    const chineseVoice = availableVoices.find(voice => voice.language === 'zh-CN');
    if (!chineseVoice) {
      console.log("Chinese voice not available.");
      Alert.alert("語音錯誤", "您的設備上沒有可用的中文語音。請在您的設備設置中啟用它。");
      return;
    }

    const translations = {
      "Head east": "向東行駛",
      "Head west": "向西行駛",
      "Head north": "向北行駛",
      "Head south": "向南行駛",
      "Turn left": "左轉",
      "Turn right": "右轉",
      "Continue straight": "繼續直行",
      "Destination will be on the right": "目的地在右邊",
      "Destination will be on the left": "目的地在左邊",
    };

    const instructions = route.legs[0].steps.map(step => {
      let instruction = step.html_instructions.replace(/<[^>]*>/g, '');
      for (const [en, zh] of Object.entries(translations)) {
        instruction = instruction.replace(new RegExp(en, 'g'), zh);
      }
      return instruction;
    }).join('。 ');

    console.log("Translated Instructions:", instructions);

    if (instructions) {
      try {
        Speech.speak(instructions, {
          language: 'zh-CN',
          onDone: () => console.log("Speech finished."),
          onError: (error) => console.error("Speech error:", error),
        });
      } catch (error) {
        console.error("Error calling Speech.speak:", error);
      }
    } else {
      console.log("No instructions to speak.");
    }
  };

  const renderItem = ({ item }: { item: RouteInfo }) => (
    <TouchableOpacity onPress={() => onSelectRoute(item)} style={[styles.card, selectedRoute?.polyline === item.polyline && styles.selectedCard]}>
      <Text style={styles.title}>{item.mode.charAt(0).toUpperCase() + item.mode.slice(1)} 路線</Text>
      <Text>預計到達時間: {item.duration.text}</Text>
      <Text>距離: {item.distance.text}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={() => onStartNavigation(item)} style={styles.button}>
          <Text style={styles.buttonText}>開始導航</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={routes}
        renderItem={renderItem}
        keyExtractor={item => item.mode}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {

    paddingVertical: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#EE8A82',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#EE8A82',
    padding: 8,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
  },
  text: {
    fontSize: 12,
  },
});

export default RouteCarousel;
