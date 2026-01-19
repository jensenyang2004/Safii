import { useReducer } from 'react';
import { TimelineEvent } from '@/types/tracking';

interface TrackingState {
  isTracking: boolean;
  trackingModeId: string | null;
  timeline: TimelineEvent[];
  currentStrike: number;
  isReportDue: boolean;
  reportDeadline: number | null;
  nextCheckInTime: number | null;
  isInfoSent: boolean;
  justReportedSafety: boolean;
}

export const initialTrackingState: TrackingState = {
  isTracking: false,
  trackingModeId: null,
  timeline: [],
  currentStrike: 0,
  isReportDue: false,
  reportDeadline: null,
  nextCheckInTime: null,
  isInfoSent: false,
  justReportedSafety: false,
};

type TrackingAction =
  | { type: 'START_SESSION'; payload: { modeId: string; timeline: TimelineEvent[]; startTime: number } }
  | { type: 'STOP_SESSION' }
  | { type: 'REPORT_SAFETY'; payload: { timeline: TimelineEvent[] } }
  | { type: 'SET_REPORT_DUE'; payload: { deadline: number } }
  | { type: 'SET_INFO_SENT'; payload: boolean }
  | { type: 'SET_JUST_REPORTED'; payload: boolean }
  | { type: 'RECONCILE_STATE'; payload: Partial<TrackingState> };

function trackingReducer(state: TrackingState, action: TrackingAction): TrackingState {
  switch (action.type) {
    case 'START_SESSION': {
      const { timeline } = action.payload;
      const nextSessionEnd = timeline.find(event => event.type === 'session_end' && event.time > Date.now());
      
      return {
        ...state,
        isTracking: true,
        trackingModeId: action.payload.modeId,
        timeline,
        currentStrike: 0,
        isReportDue: false,
        reportDeadline: null,
        nextCheckInTime: nextSessionEnd ? nextSessionEnd.time : null,
        isInfoSent: false,
        justReportedSafety: false,
      };
    }

    case 'STOP_SESSION':
      return { ...initialTrackingState };

    case 'REPORT_SAFETY': {
      const { timeline } = action.payload;
      const nextSessionEnd = timeline.find(event => event.type === 'session_end' && event.time > Date.now());

      return {
        ...state,
        timeline,
        currentStrike: 0,
        isReportDue: false,
        reportDeadline: null,
        nextCheckInTime: nextSessionEnd ? nextSessionEnd.time : null,
        justReportedSafety: true,
      };
    }

    case 'SET_REPORT_DUE':
      return {
        ...state,
        isReportDue: true,
        reportDeadline: action.payload.deadline,
      };

    case 'SET_INFO_SENT':
      return {
        ...state,
        isInfoSent: action.payload,
      };

    case 'SET_JUST_REPORTED':
      return {
        ...state,
        justReportedSafety: action.payload,
      };

    case 'RECONCILE_STATE':
      return {
        ...state,
        ...action.payload,
      };

    default:
      return state;
  }
}

export function useTrackingReducer() {
  const [state, dispatch] = useReducer(trackingReducer, initialTrackingState);
  return { state, dispatch };
}
