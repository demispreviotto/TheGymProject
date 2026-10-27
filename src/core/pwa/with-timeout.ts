export type TimedResult<T> = { timedOut: false; value: T } | { timedOut: true };

/**
 * Waits for `promise` for at most `ms`. The promise itself keeps running when the time is
 * up (a service-worker check can't be cancelled), the caller just stops waiting for it.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<TimedResult<T>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ timedOut: true }), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve({ timedOut: false, value });
      },
      () => {
        clearTimeout(timer);
        resolve({ timedOut: true });
      },
    );
  });
}
