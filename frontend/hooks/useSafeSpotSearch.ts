import { useState } from 'react';
import { Alert } from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { pois } from '@/constants/pois';
import { haversineDistance } from '@/utils/geo';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;

export interface SafeSpotData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  walkingTime?: string | null;
}

interface UseSafeSpotSearchProps {
  setDestinationInfo: (info: any) => void;
  setShowDestinationCard: (show: boolean) => void;
  setSelectedPoliceStation: (station: any) => void;
}

export const useSafeSpotSearch = ({
  setDestinationInfo,
  setShowDestinationCard,
  setSelectedPoliceStation,
}: UseSafeSpotSearchProps) => {
  const [isSearchingSafeSpot, setIsSearchingSafeSpot] = useState(false);
  const [showIntermediateSafeSpotCard, setShowIntermediateSafeSpotCard] = useState(false);
  const [showNearestSafeSpotCard, setShowNearestSafeSpotCard] = useState(false);
  const [nearestSafeSpotData, setNearestSafeSpotData] = useState<SafeSpotData | null>(null);

  const findNearestSafeSpot = async (
    location: Location.LocationObject | null,
    mapRef: React.RefObject<MapView>
  ) => {
    if (!location) {
      Alert.alert('錯誤', '無法獲取當前位置');
      return;
    }

    setIsSearchingSafeSpot(true);
    console.log('Finding nearest safe spot...');
    const origin = location.coords;

    let bestRoute = null;
    let shortestDuration = Infinity;
    const MAX_WALKING_TIME = 20 * 60; // 20 minutes in seconds

    // 篩選出警察局和便利商店
    const safeSpots = pois.filter((poi) => {
      const distance = haversineDistance(
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: poi.latitude, longitude: poi.longitude }
      );
      return (poi.type === 'police' || poi.type === 'store') && distance <= 2; // Within 2km
    });

    if (safeSpots.length === 0) {
      setIsSearchingSafeSpot(false);
      Alert.alert('提示', '附近2公里內未找到安全地點');
      return;
    }

    let errors = 0;
    for (const spot of safeSpots) {
      const destination = `${spot.latitude},${spot.longitude}`;
      const originStr = `${origin.latitude},${origin.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destination}&mode=walking&key=${GOOGLE_MAPS_API_KEY}`;

      try {
        const res = await fetch(url);
        const json = await res.json();

        if (json.status !== 'OK') {
          console.error('Google Directions API error:', json.status);
          continue;
        }

        if (json.routes.length > 0) {
          const route = json.routes[0];
          const leg = route.legs[0];
          const duration = leg.duration.value;

          // 只考慮20分鐘內可到達的地點
          if (duration < shortestDuration && duration <= MAX_WALKING_TIME) {
            shortestDuration = duration;
            bestRoute = {
              ...spot,
              distance: leg.distance,
              duration: leg.duration,
              polyline: route.overview_polyline.points,
            };
          }
        }
      } catch (e) {
        console.error('Error fetching directions:', e);
        errors++;
      }
    }

    if (errors === safeSpots.length) {
      setIsSearchingSafeSpot(false);
      Alert.alert('錯誤', '無法獲取路線資訊，請稍後再試');
      return;
    }

    if (bestRoute) {
      // Clear any existing destination info card
      setDestinationInfo(null);
      setShowDestinationCard(false);
      setSelectedPoliceStation(null); // Also clear police station card if it was showing

      // 設置選中的位置為最近的安全地點
      setNearestSafeSpotData({
        name: bestRoute.name,
        address: `${bestRoute.type === 'police' ? '警察局' : '便利商店'} - ${bestRoute.duration.text}步行距離`,
        latitude: bestRoute.latitude,
        longitude: bestRoute.longitude,
        walkingTime: bestRoute.duration.text,
      });
      setShowNearestSafeSpotCard(true);
      setShowIntermediateSafeSpotCard(false); // Hide intermediate card

      // 移動地圖到選定位置
      mapRef.current?.fitToCoordinates(
        [origin, { latitude: bestRoute.latitude, longitude: bestRoute.longitude }],
        {
          edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
          animated: true,
        }
      );
    } else {
      Alert.alert('提示', '附近20分鐘步行範圍內未找到合適的安全地點');
    }

    setIsSearchingSafeSpot(false);
  };

  return {
    isSearchingSafeSpot,
    showIntermediateSafeSpotCard,
    showNearestSafeSpotCard,
    nearestSafeSpotData,
    setShowNearestSafeSpotCard,
    setShowIntermediateSafeSpotCard,
    setNearestSafeSpotData,
    findNearestSafeSpot,
  };
};
