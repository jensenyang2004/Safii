import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';

const GOOGLE_PLACES_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ?? '';

interface MapSearchBarProps {
  onSearch: (query: string, latitude?: number, longitude?: number) => void;
  onSuggestionSelected: (description: string, latitude: number, longitude: number) => void;
}

interface PlacePrediction {
  place_id: string;
  description: string;
}

const MapSearchBar: React.FC<MapSearchBarProps> = ({ onSearch, onSuggestionSelected }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const isSuggestionSelectedRef = useRef(false); // New ref to track suggestion selection

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (query.length === 0) {
      setSuggestions([]);
      setLoading(false);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    setShowSuggestions(true);
    debounceTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${GOOGLE_PLACES_API_KEY}&language=zh-TW`
        );
        const data = await response.json();

        if (data.predictions) {
          setSuggestions(data.predictions);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching place predictions:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500); // Debounce for 500ms

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query]);

  const handleSelectSuggestion = async (prediction: PlacePrediction) => {
    isSuggestionSelectedRef.current = true; // Set flag immediately
    setQuery(prediction.description);
    setSuggestions([]);
    setShowSuggestions(false); // Explicitly hide
    setLoading(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${GOOGLE_PLACES_API_KEY}`
      );
      const data = await response.json();

      if (data.result && data.result.geometry) {
        const { lat, lng } = data.result.geometry.location;
        onSuggestionSelected(prediction.description, lat, lng);
      } else {
        onSearch(prediction.description); // Fallback to just text search if coordinates not found
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      onSearch(prediction.description); // Fallback to just text search on error
    } finally {
      setLoading(false);
      // Reset flag after a short delay to ensure onBlur has fired and checked it
      setTimeout(() => {
        isSuggestionSelectedRef.current = false;
      }, 150); // Increased delay
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
            onChangeText={setQuery}
            onFocus={() => query.length > 0 && setShowSuggestions(true)}
            onBlur={() => {
              // Use a small delay to allow handleSelectSuggestion's onPress to register
              // and potentially set isSuggestionSelectedRef.current to true
              setTimeout(() => {
                if (!isSuggestionSelectedRef.current) {
                  setShowSuggestions(false);
                }
              }, 100); // Keep a small delay for onBlur
            }}
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
                keyboardShouldPersistTaps="always"
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
    zIndex: 1000, // Ensure search bar is above other map elements
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
    maxHeight: 200, // Limit height of suggestions list
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