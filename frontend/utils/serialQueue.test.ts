// Explicit imports: the project has no @types/jest, so jest's globals aren't
// typed for tsc. @jest/globals ships with jest itself.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createSerialQueue } from './serialQueue';

/** A promise whose resolution the test controls. */
const deferred = <T = void>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/** Lets every already-queued microtask (and the ones they queue) run. */
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('createSerialQueue', () => {
  describe('run', () => {
    it('runs tasks one at a time in submission order', async () => {
      const queue = createSerialQueue({ watchdogMs: 0 });
      const log: string[] = [];
      const a = deferred();
      const b = deferred();

      const pa = queue.run('a', async () => {
        log.push('a:start');
        await a.promise;
        log.push('a:end');
      });
      const pb = queue.run('b', async () => {
        log.push('b:start');
        await b.promise;
        log.push('b:end');
      });
      const pc = queue.run('c', async () => {
        log.push('c:start');
      });

      await flush();
      expect(log).toEqual(['a:start']);

      a.resolve();
      await flush();
      expect(log).toEqual(['a:start', 'a:end', 'b:start']);

      b.resolve();
      await Promise.all([pa, pb, pc]);
      expect(log).toEqual(['a:start', 'a:end', 'b:start', 'b:end', 'c:start']);
    });

    it("resolves with the task's own value", async () => {
      const queue = createSerialQueue({ watchdogMs: 0 });
      await expect(queue.run('value', async () => 42)).resolves.toBe(42);
    });

    it('rejects only the failing caller and keeps the chain going', async () => {
      const queue = createSerialQueue({ watchdogMs: 0 });
      const failing = queue.run('fail', async () => {
        throw new Error('boom');
      });
      const next = queue.run('next', async () => 'ran');

      await expect(failing).rejects.toThrow('boom');
      await expect(next).resolves.toBe('ran');
    });

    it('treats a synchronous throw like a rejection', async () => {
      const queue = createSerialQueue({ watchdogMs: 0 });
      const failing = queue.run('sync-throw', (() => {
        throw new Error('sync');
      }) as unknown as () => Promise<void>);
      const next = queue.run('next', async () => 'ran');

      await expect(failing).rejects.toThrow('sync');
      await expect(next).resolves.toBe('ran');
    });
  });

  describe('runCoalesced', () => {
    it('reuses a queued run that has not started yet', async () => {
      const queue = createSerialQueue({ watchdogMs: 0 });
      const blocker = deferred();
      const blocking = queue.run('blocker', () => blocker.promise);

      const task = jest.fn(async () => {});
      const first = queue.runCoalesced('reconcile', task);
      const second = queue.runCoalesced('reconcile', task);
      const third = queue.runCoalesced('reconcile', task);

      expect(second).toBe(first);
      expect(third).toBe(first);

      blocker.resolve();
      await Promise.all([blocking, first]);
      expect(task).toHaveBeenCalledTimes(1);
    });

    it('queues exactly one more run when requested while one is running', async () => {
      const queue = createSerialQueue({ watchdogMs: 0 });
      const gate = deferred();
      let calls = 0;
      const task = async () => {
        calls += 1;
        if (calls === 1) await gate.promise;
      };

      const running = queue.runCoalesced('reconcile', task);
      await flush();
      expect(calls).toBe(1);

      // Five requests while the first is running collapse into one follow-up.
      const followUps = Array.from({ length: 5 }, () => queue.runCoalesced('reconcile', task));
      expect(new Set(followUps).size).toBe(1);
      expect(followUps[0]).not.toBe(running);

      gate.resolve();
      await Promise.all([running, ...followUps]);
      expect(calls).toBe(2);
    });

    it('keeps FIFO order with plain runs in between', async () => {
      const queue = createSerialQueue({ watchdogMs: 0 });
      const log: string[] = [];
      const blocker = deferred();

      const p1 = queue.run('start', async () => {
        await blocker.promise;
        log.push('start');
      });
      const p2 = queue.runCoalesced('reconcile', async () => {
        log.push('reconcile');
      });
      const p3 = queue.run('stop', async () => {
        log.push('stop');
      });
      const p4 = queue.runCoalesced('reconcile', async () => {
        log.push('reconcile-dup');
      });

      expect(p4).toBe(p2);
      blocker.resolve();
      await Promise.all([p1, p2, p3, p4]);
      expect(log).toEqual(['start', 'reconcile', 'stop']);
    });

    it('does not let a rejected coalesced run block the next request', async () => {
      const queue = createSerialQueue({ watchdogMs: 0 });
      const failing = queue.runCoalesced('reconcile', async () => {
        throw new Error('reconcile failed');
      });
      await expect(failing).rejects.toThrow('reconcile failed');

      const task = jest.fn(async () => {});
      await queue.runCoalesced('reconcile', task);
      expect(task).toHaveBeenCalledTimes(1);
    });
  });

  describe('watchdog', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('lets the next task through when one holds the queue too long', async () => {
      const onWatchdog = jest.fn();
      const queue = createSerialQueue({ watchdogMs: 1000, onWatchdog });
      const hung = deferred();
      const log: string[] = [];

      const stuck = queue.run('offline-write', async () => {
        log.push('stuck:start');
        await hung.promise;
        log.push('stuck:end');
      });
      const next = queue.run('stop', async () => {
        log.push('stop');
      });

      await jest.advanceTimersByTimeAsync(999);
      expect(log).toEqual(['stuck:start']);
      expect(onWatchdog).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      await next;
      expect(log).toEqual(['stuck:start', 'stop']);
      expect(onWatchdog).toHaveBeenCalledWith('offline-write', 1000);

      // The hung task still finishes on its own, and the queue stays usable.
      hung.resolve();
      await stuck;
      expect(log).toEqual(['stuck:start', 'stop', 'stuck:end']);
      await expect(queue.run('after', async () => 'ok')).resolves.toBe('ok');
    });

    it('never fires for a task that finishes in time', async () => {
      const onWatchdog = jest.fn();
      const queue = createSerialQueue({ watchdogMs: 1000, onWatchdog });

      await queue.run('fast', async () => {});
      await jest.advanceTimersByTimeAsync(5000);
      expect(onWatchdog).not.toHaveBeenCalled();
    });

    it('is disabled with watchdogMs: 0', async () => {
      const onWatchdog = jest.fn();
      const queue = createSerialQueue({ watchdogMs: 0, onWatchdog });
      const hung = deferred();
      const log: string[] = [];

      queue.run('hung', () => hung.promise);
      const next = queue.run('next', async () => {
        log.push('next');
      });

      await jest.advanceTimersByTimeAsync(60_000);
      expect(log).toEqual([]);
      expect(onWatchdog).not.toHaveBeenCalled();

      hung.resolve();
      await next;
      expect(log).toEqual(['next']);
    });
  });
});
