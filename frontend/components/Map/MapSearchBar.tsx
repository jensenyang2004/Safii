import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  Keyboard
} from 'react-native';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { haversineDistance } from '@/utils/geo';

const GOOGLE_PLACES_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ?? '';

interface MapSearchBarProps {
  onSearch: (query: string, latitude?: number, longitude?: number) => void;
  onNearbySearch: (query: string) => void; // New prop for nearby search
  onSuggestionSelected: (description: string, latitude: number, longitude: number) => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: { main_text: string; secondary_text: string };
}

// Enriched suggestion type that includes distance
interface EnrichedSuggestion extends PlacePrediction {
  distance: number | null; // distance in km
}

const MapSearchBar: React.FC<MapSearchBarProps> = ({ onSearch, onNearbySearch, onSuggestionSelected, userLocation }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<EnrichedSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const shouldSearchRef = useRef(true);

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (query.length === 0 || !shouldSearchRef.current) {
      if (query.length === 0) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      shouldSearchRef.current = true;
      return; 
    }

    setLoading(true);
    setShowSuggestions(true);

    debounceTimeout.current = setTimeout(async () => {
      try {
        // <<< MODIFICATION: Removed location and radius bias for global search results >>>
        const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}&language=zh-TW&components=country:tw`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        let finalSuggestions: EnrichedSuggestion[] = [];

        // Create and add the special "Search Nearby" suggestion
        const specialSuggestion: EnrichedSuggestion = {
          place_id: `search_nearby_${query}`,
          description: `搜尋附近的「${query}」`,
          structured_formatting: {
            main_text: `搜尋附近的「${query}」`,
            secondary_text: '尋找此區域的相關地點',
          },
          distance: null,
        };
        finalSuggestions.push(specialSuggestion);

        if (data.status === 'OK' && data.predictions) {
          const apiSuggestions: EnrichedSuggestion[] = data.predictions.map((p: PlacePrediction) => ({
            ...p,
            distance: null,
          }));
          finalSuggestions.push(...apiSuggestions);
          
          setSuggestions(finalSuggestions);

          // If we have a user location, we can still fetch details to show distance
          if (userLocation) {
            const detailPromises = data.predictions.map((p: PlacePrediction) => 
              fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=geometry&key=${GOOGLE_PLACES_API_KEY}`)
                .then(res => res.json())
            );

            const detailResults = await Promise.all(detailPromises);

            const suggestionsWithDistance = finalSuggestions.map((suggestion) => {
              const apiPredictionIndex = data.predictions.findIndex((p: PlacePrediction) => p.place_id === suggestion.place_id);
              if (apiPredictionIndex > -1) {
                const detail = detailResults[apiPredictionIndex];
                if (detail.result && detail.result.geometry) {
                  const { lat, lng } = detail.result.geometry.location;
                  const distance = haversineDistance(userLocation, { latitude: lat, longitude: lng });
                  return { ...suggestion, distance };
                }
              }
              return suggestion;
            });
            setSuggestions(suggestionsWithDistance);
          }
        } else {
          setSuggestions(finalSuggestions);
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
  }, [query, userLocation]);

  const handleSelectSuggestion = async (prediction: PlacePrediction) => {
    // If the special "Search Nearby" suggestion is selected
    if (prediction.place_id.startsWith('search_nearby_')) {
      onNearbySearch(query);
      setShowSuggestions(false);
      Keyboard.dismiss();
      return;
    }

    // Existing logic for normal place suggestions
    shouldSearchRef.current = false;
    setQuery(prediction.description);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
    setLoading(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry&key=${GOOGLE_PLACES_API_KEY}`
      );
      const data = await response.json();

      if (data.result && data.result.geometry) {
        const { lat, lng } = data.result.geometry.location;
        onSuggestionSelected(prediction.description, lat, lng);
      } else {
        // Fallback to onSearch if details fail
        onSearch(prediction.description);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      onSearch(prediction.description);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={90} tint="light" style={styles.blurView}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            placeholder="搜尋地點或附近的地點"
            value={query}
            onChangeText={(text) => {
              shouldSearchRef.current = true;
              setQuery(text);
            }}
            onFocus={() => {
                if (query.length > 0) setShowSuggestions(true);
            }}
            returnKeyType="search"
            onSubmitEditing={() => {
              // Pressing enter will now search for the destination, not nearby
              if (query.trim().length > 0) {
                onSearch(query);
                setShowSuggestions(false);
                Keyboard.dismiss();
              }
            }}
          />
        </View>
      </BlurView>
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <View style={styles.suggestionsContainer}>
          <BlurView intensity={90} tint="light" style={styles.suggestionsBlurView}>
            {loading && suggestions.length === 0 ? (
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
                    <MaterialIcons 
                      name={item.place_id.startsWith('search_nearby_') ? 'search' : 'location-on'} 
                      size={24} 
                      color="#555" 
                      style={styles.icon} 
                    />
                    <View style={styles.textContainer}>
                      <Text style={styles.suggestionMainText}>{item.structured_formatting?.main_text ?? item.description.split(',')[0]}</Text>
                      <Text style={styles.suggestionSecondaryText}>{item.structured_formatting?.secondary_text ?? item.description.substring(item.description.indexOf(',') + 1).trim()}</Text>
                    </View>
                    {item.distance !== null && (
                       <Text style={styles.distanceText}>{item.distance.toFixed(1)} km</Text>
                    )}
                  </TouchableOpacity>
                )}
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
    fontSize: 16,
  },
  suggestionsContainer: {
    maxHeight: 240,
    borderColor: '#ccc',
    borderTopWidth: 1,
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  suggestionsBlurView: {
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  icon: {
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  suggestionMainText: {
    fontSize: 16,
    fontWeight: '500',
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  distanceText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  loadingIndicator: {
    padding: 10,
  },
});

export default MapSearchBar;