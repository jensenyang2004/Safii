export interface SafeSpot {
  id: string;
  name: string;
  type: 'police' | 'store' | 'hospital';
  latitude: number;
  longitude: number;
  description?: string;
  address?: string;
}

export const SAFE_SPOTS: SafeSpot[] = [
  {
    id: 'police_1',
    name: '中正一分局',
    type: 'police',
    latitude: 25.0421,
    longitude: 121.5074,
    description: '臺北市中正區公園路15號'
  },
  {
    id: 'police_2',
    name: '中正二分局',
    type: 'police',
    latitude: 25.0308,
    longitude: 121.5219,
    description: '臺北市中正區武昌街一段77號'
  },
  {
    id: 'store_1',
    name: '全家便利商店',
    type: 'store',
    latitude: 25.0337,
    longitude: 121.5645,
    description: '24小時營業'
  },
  {
    id: 'store_2',
    name: '7-ELEVEN',
    type: 'store',
    latitude: 25.0412,
    longitude: 121.5432,
    description: '24小時營業'
  },
  {
    id: 'hospital_1',
    name: '台大醫院',
    type: 'hospital',
    latitude: 25.0421,
    longitude: 121.5168,
    description: '臺北市中正區中山南路7號'
  },
  {
    id: 'p1',
    name: '大安分局新生南路派出所',
    type: 'police',
    latitude: 25.0330,
    longitude: 121.5339,
    address: '台北市大安區新生南路二段86號',
  },
  {
    id: 'p2',
    name: '中正第一分局忠孝西路派出所',
    type: 'police',
    latitude: 25.0469,
    longitude: 121.5175,
    address: '台北市中正區忠孝西路一段35號',
  },
  {
    id: 'p3',
    name: '信義分局三張犁派出所',
    type: 'police',
    latitude: 25.0338,
    longitude: 121.5645,
    address: '台北市信義區基隆路二段151號',
  },
  {
    id: 's1',
    name: '7-ELEVEN 台大店',
    type: 'store',
    latitude: 25.0259,
    longitude: 121.5354,
    address: '台北市大安區羅斯福路四段1號',
  },
  {
    id: 's2',
    name: '全家 FamilyMart 台北車站店',
    type: 'store',
    latitude: 25.0479,
    longitude: 121.5170,
    address: '台北市中正區忠孝西路一段49號',
  },
  {
    id: 's3',
    name: '萊爾富 Hi-Life 市府店',
    type: 'store',
    latitude: 25.0408,
    longitude: 121.5637,
    address: '台北市信義區松仁路100號',
  },
];