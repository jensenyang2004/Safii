import { decode } from '@googlemaps/polyline-codec';

export const decodePolyline = (encodedPolyline: string): { latitude: number; longitude: number }[] => {
  console.log('Decoding polyline string:', encodedPolyline);
  try {
    const decoded = decode(encodedPolyline);
    // console.log('Decoded polyline:', JSON.stringify(decoded, null, 2));
    const coordinates = decoded.map(([latitude, longitude]) => ({ latitude, longitude }));
    // console.log('Mapped coordinates:', JSON.stringify(coordinates, null, 2));
    console.log('Finished and returing decoded polyline string:', encodedPolyline);
    return coordinates;
  } catch (error) {
    console.error('CRASH IN DECODEPOLYLINE:', error);
    console.error('Polyline that caused crash:', encodedPolyline);
    return [];
  }
  
};
