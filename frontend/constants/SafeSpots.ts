export interface SafeSpot {export interface SafeSpot {export interface SafeSpot {export interface SafeSpot {

  id: string;

  name: string;  id: string;

  type: 'police' | 'store' | 'hospital';

  latitude: number;  name: string;  id: string;  id: string;

  longitude: number;

  description: string;  type: 'police' | 'store' | 'hospital';

}

  latitude: number;  name: string;  name: string;

export const SAFE_SPOTS: SafeSpot[] = [

  {  longitude: number;

    id: 'police_1',

    name: '中正一分局',  description?: string;  type: 'police' | 'store' | 'hospital';  type: 'police' | 'store';

    type: 'police',

    latitude: 25.0421,}

    longitude: 121.5074,

    description: '臺北市中正區公園路15號'  latitude: number;  latitude: number;

  },

  {export const SAFE_SPOTS: SafeSpot[] = [

    id: 'store_1',

    name: '全家便利商店',  {  longitude: number;  longitude: number;

    type: 'store',

    latitude: 25.0337,    id: 'police_1',

    longitude: 121.5645,

    description: '24小時營業'    name: '中正一分局',  description?: string;  address: string;

  },

  {    type: 'police',

    id: 'hospital_1',

    name: '台大醫院',    latitude: 25.0421,}  description?: string;

    type: 'hospital',

    latitude: 25.0421,    longitude: 121.5074,

    longitude: 121.5168,

    description: '臺北市中正區中山南路7號'    description: '臺北市中正區公園路15號'}

  }

];  },

  {export const SAFE_SPOTS: SafeSpot[] = [

    id: 'police_2',

    name: '中正二分局',  {export const SAFE_SPOTS: SafeSpot[] = [

    type: 'police',

    latitude: 25.0308,    id: 'police_1',  // Police Stations (Sample Data)

    longitude: 121.5219,

    description: '臺北市中正區武昌街一段77號'    name: '中正一分局',  {

  },

  {    type: 'police',    id: 'p1',

    id: 'store_1',

    name: '全家便利商店',    latitude: 25.0421,    name: '大安分局新生南路派出所',

    type: 'store',

    latitude: 25.0337,    longitude: 121.5074,    type: 'police',

    longitude: 121.5645,

    description: '24小時營業'    description: '臺北市中正區公園路15號'    latitude: 25.0330,

  },

  {  },    longitude: 121.5339,

    id: 'store_2',

    name: '7-ELEVEN',  {    address: '台北市大安區新生南路二段86號',

    type: 'store',

    latitude: 25.0412,    id: 'police_2',  },

    longitude: 121.5432,

    description: '24小時營業'    name: '中正二分局',  {

  },

  {    type: 'police',    id: 'p2',

    id: 'hospital_1',

    name: '台大醫院',    latitude: 25.0308,    name: '中正第一分局忠孝西路派出所',

    type: 'hospital',

    latitude: 25.0421,    longitude: 121.5219,    type: 'police',

    longitude: 121.5168,

    description: '臺北市中正區中山南路7號'    description: '臺北市中正區武昌街一段77號'    latitude: 25.0469,

  }

];  },    longitude: 121.5175,

  {    address: '台北市中正區忠孝西路一段35號',

    id: 'store_1',  },

    name: '全家便利商店',  {

    type: 'store',    id: 'p3',

    latitude: 25.0337,    name: '信義分局三張犁派出所',

    longitude: 121.5645,    type: 'police',

    description: '24小時營業'    latitude: 25.0338,

  },    longitude: 121.5645,

  {    address: '台北市信義區基隆路二段151號',

    id: 'store_2',  },

    name: '7-ELEVEN',

    type: 'store',  // Convenience Stores (Sample Data)

    latitude: 25.0412,  {

    longitude: 121.5432,    id: 's1',

    description: '24小時營業'    name: '7-ELEVEN 台大店',

  },    type: 'store',

  {    latitude: 25.0259,

    id: 'hospital_1',    longitude: 121.5354,

    name: '台大醫院',    address: '台北市大安區羅斯福路四段1號',

    type: 'hospital',  },

    latitude: 25.0421,  {

    longitude: 121.5168,    id: 's2',

    description: '臺北市中正區中山南路7號'    name: '全家 FamilyMart 台北車站店',

  }    type: 'store',

];    latitude: 25.0479,
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
