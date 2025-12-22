import Constants from "expo-constants";
import * as Location from 'expo-location';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;

export const calculateWalkingTime = async (origin: Location.LocationObject, destination: { latitude: number; longitude: number }) => {
  try {
    const originStr = `${origin.coords.latitude},${origin.coords.longitude}`;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destination.latitude},${destination.longitude}&mode=walking&language=zh-TW&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Directions API error:', data.status);
      return '計算錯誤';
    }

    if (data.routes && data.routes[0] && data.routes[0].legs && data.routes[0].legs[0]) {
      return data.routes[0].legs[0].duration.text;
    }

    return '無法計算';
  } catch (error) {
    console.error('Error calculating walking time:', error);
    return '計算錯誤';
  }
};
