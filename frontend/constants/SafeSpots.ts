export interface SafeSpot {
  id: string;
  name: string;
  type: 'police' | 'store';
  latitude: number;
  longitude: number;
}

export const SAFE_SPOTS: SafeSpot[] = [
  // Police Stations (Sample Data)
  {
    id: 'p1',
    name: '大安分局新生南路派出所',
    type: 'police',
    latitude: 25.0330,
    longitude: 121.5339,
  },
  {
    id: 'p2',
    name: '中正第一分局忠孝西路派出所',
    type: 'police',
    latitude: 25.0469,
    longitude: 121.5175,
  },
  {
    id: 'p3',
    name: '信義分局三張犁派出所',
    type: 'police',
    latitude: 25.0338,
    longitude: 121.5645,
  },

  // Convenience Stores (Sample Data)
  {
    id: 's1',
    name: '7-ELEVEN 台大店',
    type: 'store',
    latitude: 25.0259,
    longitude: 121.5354,
  },
  {
    id: 's2',
    name: '全家 FamilyMart 台北車站店',
    type: 'store',
    latitude: 25.0479,
    longitude: 121.5170,
  },
  {
    id: 's3',
    name: '萊爾富 Hi-Life 市府店',
    type: 'store',
    latitude: 25.0408,
    longitude: 121.5637,
  },
];
