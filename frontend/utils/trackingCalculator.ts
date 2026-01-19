import { TimelineEvent } from '../types/tracking';

/**
 * Calculates the full timeline of events for a tracking session.
 * 
 * @param startTime The start time of the session in milliseconds.
 * @param sessionDurationMs The duration of the initial session in milliseconds.
 * @param reportDurationMs The duration allowed for reporting safety in milliseconds.
 * @param reductionMs The amount of time to reduce from the session duration after each strike.
 * @param strikeThreshold The number of strikes allowed before emergency is triggered.
 * @returns An array of TimelineEvent objects.
 */
export const calculateFullTimeline = (
  startTime: number,
  sessionDurationMs: number,
  reportDurationMs: number,
  reductionMs: number,
  strikeThreshold: number
): TimelineEvent[] => {
  const timeline: TimelineEvent[] = [];
  let currentTime = startTime;
  let currentSessionDuration = sessionDurationMs;

  for (let strike = 0; strike < strikeThreshold; strike++) {
    const sessionEndTime = currentTime + currentSessionDuration;
    const reportDeadlineTime = sessionEndTime + reportDurationMs;
    
    // Event for when the session ends and the user must report
    timeline.push({
      time: sessionEndTime,
      type: 'session_end',
      strike: strike,
      description: `Session ${strike + 1} ends - Report safety required`,
      deadline: reportDeadlineTime,
      strikeThreshold: strikeThreshold,
    });

    // Event for when the report deadline is missed (strike recorded)
    timeline.push({
      time: reportDeadlineTime,
      type: 'missed_report',
      strike: strike + 1,
      description: `Missed report ${strike + 1} - ${strike < strikeThreshold - 1 ? 'Start next session' : 'EMERGENCY!'}`,
      strikeThreshold: strikeThreshold
    });

    // Prepare for the next loop iteration
    currentTime = reportDeadlineTime;
    // Reduce the duration for the next session, but don't let it go below 1 minute
    currentSessionDuration = Math.max(currentSessionDuration - reductionMs, 1 * 60 * 1000);
  }

  return timeline;
};
