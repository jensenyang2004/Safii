export interface POI {
  id: string;
  type: 'police' | 'hospital' | 'store' | 'light' | 'camera';
  name: string;
  latitude: number;
  longitude: number;
  open_hours?: string;
  weight: number;
}

export interface HeatmapCell {
  box: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  risk: number;
}

export interface Step {
  html_instructions: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  end_location: { lat: number; lng: number };
  start_location: { lat: number; lng: number };
  polyline: { points: string };
  travel_mode: string;
  maneuver?: string;
}

export interface Leg {
  steps: Step[];
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  end_address: string;
  start_address: string;
  end_location: { lat: number; lng: number };
  start_location: { lat: number; lng: number };
}

export interface RouteInfo {
  mode: 'fastest' | 'shortest' | 'safest';
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  polyline: { latitude: number; longitude: number }[];
  encodedPolyline: string;
  safetyScore: number;
  legs: Leg[];
}
