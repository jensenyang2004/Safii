import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Keyboard // [確認] 有引入 Keyboard，很好
} from 'react-native';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';

const GOOGLE_PLACES_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ?? '';

interface MapSearchBarProps {
  onSearch: (query: string, latitude?: number, longitude?: number) => void;
  onSuggestionSelected: (description: string, latitude: number, longitude: number) => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: { main_text: string; secondary_text: string };
}

const MapSearchBar: React.FC<MapSearchBarProps> = ({ onSearch, onSuggestionSelected, userLocation }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const shouldSearchRef = useRef(true); // 控制 API 搜尋的開關

  // [移除] 移除了 isSuggestionSelectedRef，因為我們不需要它了

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // 檢查：如果是空字串，或是由程式填入的 (shouldSearchRef=false)
    if (query.length === 0 || !shouldSearchRef.current) {
      if (query.length === 0) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      shouldSearchRef.current = true; // 重置開關
      return; 
    }

    setLoading(true);
    setShowSuggestions(true);

    debounceTimeout.current = setTimeout(async () => {
      try {
        let apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}&language=zh-TW&components=country:tw`;

        if (userLocation) {
          apiUrl += `&location=${userLocation.latitude},${userLocation.longitude}&radius=50000&locationbias=circle:50000@${userLocation.latitude},${userLocation.longitude}`;
        }

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.predictions) {
          setSuggestions(data.predictions);
        } else {
            console.log("Place API status:", data.status);
            setSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching place predictions:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query, userLocation]); // [修正 1] 補上 userLocation，這樣 GPS 定位完成後會自動刷新搜尋結果

  const handleSelectSuggestion = async (prediction: PlacePrediction) => {
    shouldSearchRef.current = false; // 1. 阻止 useEffect 搜尋

    setQuery(prediction.description);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss(); // 2. 關閉鍵盤
    setLoading(true);

    try {
      // 這裡請求詳細資料 (包含座標)
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry&key=${GOOGLE_PLACES_API_KEY}`
      );
      const data = await response.json();

      if (data.result && data.result.geometry) {
        const { lat, lng } = data.result.geometry.location;
        onSuggestionSelected(prediction.description, lat, lng);
      } else {
        onSearch(prediction.description);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      onSearch(prediction.description);
    } finally {
      setLoading(false);
      // [移除] 不需要 setTimeout 重置 ref 了，useEffect 已經處理好了
    }
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={90} tint="light" style={styles.blurView}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            placeholder="輸入目的地"
            value={query}
            onChangeText={(text) => {
              shouldSearchRef.current = true; // 手動打字，允許搜尋
              setQuery(text);
            }}
            onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
            }}
            // [修正 2] 移除了 onBlur，因為它會跟 FlatList 點擊事件打架
            // 我們改用 keyboardShouldPersistTaps 處理
          />
        </View>
      </BlurView>
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <View style={styles.suggestionsContainer}>
          <BlurView intensity={90} tint="light" style={styles.suggestionsBlurView}>
            {loading ? (
              <ActivityIndicator size="small" color="#0000ff" style={styles.loadingIndicator} />
            ) : (
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item)}
                  >
                    <Text style={styles.suggestionText}>{item.description}</Text>
                  </TouchableOpacity>
                )}
                // [修正 3] handled 是最佳解 (比 always 好)
                // 這行保證了點擊列表時，優先觸發 onPress，然後才讓鍵盤收起來
                keyboardShouldPersistTaps="handled" 
              />
            )}
          </BlurView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    width: '90%',
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  blurView: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    padding: 20,
  },
  suggestionsContainer: {
    maxHeight: 200,
    borderColor: '#ccc',
    borderTopWidth: 1,
  },
  suggestionsBlurView: {
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
  },
  loadingIndicator: {
    padding: 10,
  },
});

export default MapSearchBar;