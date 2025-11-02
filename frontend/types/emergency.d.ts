import { Timestamp } from 'firebase/firestore';

export interface EmergencyData {
  emergencyDocId: string;
  lat: number;
  long: number;
  trackedUserName: string;
  updateTime: Timestamp;
}