// A strictly serial task queue: each task starts only after the previous one
// has settled, in the order they were submitted. Pure — no React or Expo —
// so it can be unit tested on its own.
//
// Built for TrackProvider's session mutators (reconcile, start, report,
// stop, hydrate, sign-out cleanup), which must never interleave: one of them
// scheduling a batch while another, reading stale storage, cancels it leaves
// a real tracking session with no check-in or final-strike notification.
//
// Two extras on top of plain FIFO:
// - runCoalesced(key): at most one task per key running plus one waiting.
//   A request while one is already waiting reuses it, so a caller that fires
//   every second (TrackProvider's deadline interval) can't pile up work.
// - watchdog: if a task holds the queue longer than watchdogMs, the next task
//   is let through anyway. A hung task (e.g. a write that never resolves
//   offline) must not block every later stop or safety report. The hung task
//   keeps running in the background; it just stops holding the queue.

export interface SerialQueueOptions {
  /** How long one task may hold the queue before the next is let through. 0 disables. */
  watchdogMs?: number;
  /** Called when the watchdog releases the queue from a task still running. */
  onWatchdog?: (label: string, heldMs: number) => void;
}

export interface SerialQueue {
  /** Runs `task` after every previously submitted task has settled. Resolves/rejects with it. */
  run<T>(label: string, task: () => Promise<T>): Promise<T>;
  /**
   * Like `run`, but if a task with this key is queued and hasn't started yet,
   * returns that one's promise instead of queuing another.
   */
  runCoalesced(key: string, task: () => Promise<void>): Promise<void>;
}

export const DEFAULT_WATCHDOG_MS = 20_000;

export function createSerialQueue(options: SerialQueueOptions = {}): SerialQueue {
  const { watchdogMs = DEFAULT_WATCHDOG_MS, onWatchdog } = options;

  // Resolves when the most recently submitted task releases the queue. Never
  // rejects — task failures go to that task's caller, not down the chain.
  let tail: Promise<void> = Promise.resolve();
  const waitingByKey = new Map<string, Promise<void>>();

  const run = <T>(label: string, task: () => Promise<T>): Promise<T> => {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>(resolve => {
      release = resolve;
    });

    return previous.then(async () => {
      let released = false;
      const releaseOnce = () => {
        if (released) return;
        released = true;
        release();
      };
      const watchdog =
        watchdogMs > 0
          ? setTimeout(() => {
              onWatchdog?.(label, watchdogMs);
              releaseOnce();
            }, watchdogMs)
          : null;

      try {
        return await task();
      } finally {
        if (watchdog) clearTimeout(watchdog);
        releaseOnce();
      }
    });
  };

  const runCoalesced = (key: string, task: () => Promise<void>): Promise<void> => {
    const waiting = waitingByKey.get(key);
    if (waiting) return waiting;

    const queued = run(key, () => {
      // Started: from now on a new request has to queue a fresh run, since
      // this one may already have read state the request wants re-read.
      waitingByKey.delete(key);
      return task();
    });
    waitingByKey.set(key, queued);
    return queued;
  };

  return { run, runCoalesced };
}
