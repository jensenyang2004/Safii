export interface TimelineEvent {
  time: number;
  type: 'session_end' | 'missed_report';
  strike: number;
  description: string;
  deadline?: number;
  strikeThreshold?: number;
}

export interface NotificationData {
  type: string;
  strike: number;
  eventTime: number;
  deadline?: number;
  strikeThreshold?: number;
}

export interface TrackingMode {
  id: string;
  name: string;
  userId: string;
  On?: boolean;
  autoStart?: boolean;
  checkIntervalMinutes: number;
  unresponsiveThreshold: number;
  intervalReductionMinutes: number;
  startTime: {
    dayOfWeek: string[];
    time: string;
  };
  emergencyContactIds: string[];
  activityLocation?: string;
  activity?: string;
  notes?: string;
  contacts?: any[];
}

export type TrackingContextType = {
  trackingModes: any[];
  loading: boolean;
  startTrackingMode: (modeId: any, sessionMinutes: number, reductionMinutes: number) => Promise<void>;
  stopTrackingMode: (options?: { isEmergency: boolean }) => Promise<void>;
  reportSafety: () => Promise<void>;
  createTrackingMode: (newMode: Omit<TrackingMode, 'id' | 'userId'>) => Promise<void>;
  updateTrackingMode: (modeId: string, updates: Partial<TrackingMode>) => Promise<void>;
  deleteTrackingMode: (modeId: string) => Promise<void>;
  isTracking: boolean;
  trackingModeId: string | null;
  timeline: TimelineEvent[];
  currentStrike: number;
  isReportDue: boolean;
  reportDeadline: number | null;
  nextCheckInTime: number | null;
  isInfoSent: boolean;
  setIsInfoSent: React.Dispatch<React.SetStateAction<boolean>>;
  justReportedSafety: boolean;
  setJustReportedSafety: React.Dispatch<React.SetStateAction<boolean>>;
};