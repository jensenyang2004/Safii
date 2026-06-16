import { Alert } from 'react-native';
import { useState } from 'react';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { pois } from '@/constants/pois';
import { haversineDistance } from '@/utils/geo';
// 引入 POI 型別，或在此定義一個通用介面
import { POI } from '@/types'; 

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
  setSelectedPoliceStation?: (station: any) => void;
}

// 定義一個通用介面來統一本地資料與 Google API 資料
interface CandidateSpot {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'police' | 'store';
  straightDistance?: number; // 直線距離 (km)
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
    // 1. 基本檢查
    if (!location) {
      Alert.alert('錯誤', '無法獲取當前位置');
      return;
    }
    if (!GOOGLE_MAPS_API_KEY) {
      Alert.alert('設定錯誤', '缺少 Google Maps API Key');
      return;
    }

    setIsSearchingSafeSpot(true);
    console.log('🚀 開始混合搜尋 (本地警局 + 雲端超商)...');
    
    const origin = location.coords;
    const MAX_WALKING_TIME_SEC = 20 * 60; // 20分鐘
    const SEARCH_RADIUS_KM = 2; // 2公里
    const API_CANDIDATE_LIMIT = 5; // 最後只對前 5 名查路線

    // ==========================================
    // 步驟 A: 獲取候選清單 (混合資料源)
    // ==========================================

    // Task 1: 從本地 pois 篩選警察局
    const localPoliceCandidates: CandidateSpot[] = pois
      .filter(p => p.type === 'police') // 只找警察局
      .map(p => ({
        name: p.name,
        address: p.address || '警察局',
        latitude: p.latitude,
        longitude: p.longitude,
        type: 'police' as const
      }));

    // Task 2: 從 Google API 搜尋便利商店
    const fetchStoresPromise = async (): Promise<CandidateSpot[]> => {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${origin.latitude},${origin.longitude}&radius=${SEARCH_RADIUS_KM * 1000}&type=convenience_store&key=${GOOGLE_MAPS_API_KEY}&language=zh-TW`;
      
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === 'OK') {
          return json.results.map((place: any) => ({
            name: place.name,
            address: place.vicinity || place.name,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            type: 'store' as const
          }));
        }
        console.warn('Google Places API (Stores) returned status:', json.status);
        return [];
      } catch (e) {
        console.error('Failed to fetch stores:', e);
        return [];
      }
    };

    // 等待 Task 2 完成 (Task 1 是同步的，已經完成了)
    const googleStoreCandidates = await fetchStoresPromise();

    // 合併清單
    const allCandidates = [...localPoliceCandidates, ...googleStoreCandidates];

    // ==========================================
    // 步驟 B: 計算直線距離並初步排序
    // ==========================================
    
    const sortedCandidates = allCandidates
      .map(spot => ({
        ...spot,
        straightDistance: haversineDistance(
          { latitude: origin.latitude, longitude: origin.longitude },
          { latitude: spot.latitude, longitude: spot.longitude }
        )
      }))
      .filter(spot => spot.straightDistance <= SEARCH_RADIUS_KM) // 再過濾一次確保都在範圍內
      .sort((a, b) => a.straightDistance - b.straightDistance) // 由近到遠
      .slice(0, API_CANDIDATE_LIMIT); // 只取前 5 名

    if (sortedCandidates.length === 0) {
      setIsSearchingSafeSpot(false);
      Alert.alert('提示', '附近 2 公里內未找到警察局或便利商店');
      return;
    }

    console.log(`📍 綜合篩選出 ${sortedCandidates.length} 個最佳候選點，開始查步行路線...`);

    // ==========================================
    // 步驟 C: 平行查詢步行時間 (Directions API)
    // ==========================================

    const routePromises = sortedCandidates.map(async (spot) => {
      const destination = `${spot.latitude},${spot.longitude}`;
      const originStr = `${origin.latitude},${origin.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destination}&mode=walking&key=${GOOGLE_MAPS_API_KEY}`;

      try {
        const res = await fetch(url);
        const json = await res.json();

        if (json.status === 'OK' && json.routes.length > 0) {
          const leg = json.routes[0].legs[0];
          const durationValue = leg.duration.value;

          if (durationValue <= MAX_WALKING_TIME_SEC) {
            return {
              spot,
              duration: leg.duration, // { text: "5 mins", value: 300 }
              distance: leg.distance,
              isValid: true,
            };
          }
        }
      } catch (e) {
        console.error(`Error checking route for ${spot.name}:`, e);
      }
      return { isValid: false };
    });

    const results = await Promise.all(routePromises);

    // ==========================================
    // 步驟 D: 擇優並更新 UI
    // ==========================================

    const validRoutes = results
      .filter((r): r is any => r.isValid)
      .sort((a, b) => a.duration.value - b.duration.value);

    const bestRoute = validRoutes[0];

    if (bestRoute) {
      const typeName = bestRoute.spot.type === 'police' ? '警察局' : '便利商店';
      console.log(`✅ 找到最佳地點: ${bestRoute.spot.name} (${typeName}), 步行: ${bestRoute.duration.text}`);
      
      setDestinationInfo(null);
      setShowDestinationCard(false);
      if (setSelectedPoliceStation) setSelectedPoliceStation(null);

      setNearestSafeSpotData({
        name: bestRoute.spot.name,
        address: `${typeName} - 步行約 ${bestRoute.duration.text}`,
        latitude: bestRoute.spot.latitude,
        longitude: bestRoute.spot.longitude,
        walkingTime: bestRoute.duration.text,
      });
      setShowNearestSafeSpotCard(true);
      setShowIntermediateSafeSpotCard(false);

      mapRef.current?.fitToCoordinates(
        [origin, { latitude: bestRoute.spot.latitude, longitude: bestRoute.spot.longitude }],
        {
          edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
          animated: true,
        }
      );
    } else {
      Alert.alert('提示', '附近地點步行時間皆過長或無法導航');
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