import { decode } from '@googlemaps/polyline-codec';

export const decodePolyline = (encodedPolyline: string): { latitude: number; longitude: number }[] => {
  const decoded = decode(encodedPolyline);
  return decoded.map(([latitude, longitude]) => ({ latitude, longitude }));
};