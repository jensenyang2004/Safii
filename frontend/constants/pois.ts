import { POI } from '../types';

export const pois: POI[] = [
  { id: 'p1', type: 'police', name: 'Police Station 1', latitude: 34.06, longitude: -118.24, weight: 1.0 },
  { id: 'p2', type: 'police', name: 'Police Station 2', latitude: 34.055, longitude: -118.245, weight: 1.0 },
  { id: 'h1', type: 'hospital', name: 'General Hospital', latitude: 34.05, longitude: -118.25, weight: 0.8 },
  { id: 's1', type: 'store', name: '24/7 Convenience', latitude: 34.052, longitude: -118.241, weight: 0.5, open_hours: '0-24' },
  { id: 'l1', type: 'light', name: 'Street Light', latitude: 34.053, longitude: -118.242, weight: 0.3 },
  { id: 'c1', type: 'camera', name: 'Security Camera', latitude: 34.054, longitude: -118.243, weight: 0.3 },
];
