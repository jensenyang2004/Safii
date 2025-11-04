import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native';
import { router } from 'expo-router';
import * as Theme from '../../constants/Theme';

const characters = [
  {
    id: '1',
    title: '男友來電',
    description: '計程車專用：他會關心你，現在在哪、什麼時候到家，給予真實男友無可比擬的情緒價值。',
    avatar: require('../../assets/avatar-photo/boyfriend.png'),
  },
  {
    id: '2',
    title: '老媽來電',
    description: '老媽語氣親切、熟悉、關心你的位置、還有宵夜又要吃什麼垃圾食物了。',
    avatar: require('../../assets/avatar-photo/mom.png'),
  },
  {
    id: '3',
    title: '閨蜜來電',
    description: '走夜路專用，語氣輕鬆自然，可以聊各種話題，特別是八卦，別擔心，我們不會講出去。',
    avatar: require('../../assets/avatar-photo/bestie.png'),
  }
];

const FirebaseTestScreen = () => {
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);

  const handleCallPress = () => {
    if (selectedCharacter) {
      router.push({ pathname: '/(modals)/openai_call', params: { title: selectedCharacter.title } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>假電話功能</Text>
        <Text>您可以依照自己喜好選擇自己的假電話情境，因為目前是beta版，一個人的通話次數限制為十次。</Text>
        <View style={styles.characterList}>
          {characters.map((char) => (
            <TouchableOpacity
              key={char.id}
              style={[styles.characterButton, selectedCharacter?.id === char.id && styles.selectedCharacter]}
              onPress={() => setSelectedCharacter(char)}
            >
              <Image source={char.avatar} style={styles.avatar} />
              <View style={styles.characterText}>
                <Text style={styles.characterTitle}>{char.title}</Text>
                <Text style={styles.characterDescription}>{char.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.callButton, !selectedCharacter && styles.disabledButton]}
        onPress={handleCallPress}
        disabled={!selectedCharacter}
      >
        <Text style={styles.callButtonText}>Call</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    padding: 20,
  },
  content: {
    flex: 1,
    width: '90%',
    alignSelf: 'center',
    borderRadius: 50,
    gap: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  characterList: {
    // Styles for the list container
  },
  characterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCharacter: {
    borderColor: Theme.colors.primary,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  characterText: {
    flex: 1,
  },
  characterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  characterDescription: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    backgroundColor: Theme.colors.primary,
    marginBottom: '20%',
    height: 'auto',
    width: '90%',
    alignSelf: 'center',
    padding: 20,
    borderRadius: 32,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  callButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

export default FirebaseTestScreen;
