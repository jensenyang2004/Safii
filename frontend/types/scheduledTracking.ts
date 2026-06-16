import { Timestamp } from 'firebase/firestore';

export interface DefaultHome {
    lat: number;
    lng: number;
    radius: number;   // metres, default 100
    address: string;
}

export interface ScheduledTrackingDestination {
    useDefaultHome: boolean;
    lat: number;
    lng: number;
    radius: number;   // metres
    address: string;
}

export interface ScheduledTracking {
    id: string;
    userId: string;
    name: string;
    daysOfWeek: number[];       // 0=Sun, 1=Mon, …, 6=Sat
    startTime: string;          // "HH:MM"
    endTime: string;            // "HH:MM"
    timezone: string;           // e.g. "Asia/Taipei"
    isEnabled: boolean;
    isManualOnly: boolean;
    destination: ScheduledTrackingDestination;
    unresponsiveThreshold?: number;
    checkIntervalMinutes: number;
    emergencyContactIds: string[];
    activity: string;
    notes: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface ActiveScheduledSession {
    id: string;
    trackedUserId: string;
    scheduleId: string;
    overallStatus: 'tracking' | 'notifying' | 'safe_arrived' | 'safe_stopped' | 'completed';
    isActive: boolean;
    hasArrivedHome: boolean;
    arrivedAt?: Timestamp | null;
    scheduledEndTime?: Timestamp | null;
    destination?: {
        lat: number;
        lng: number;
        radius: number;
        address: string;
    } | null;
    triggeredBy: 'schedule';
}
