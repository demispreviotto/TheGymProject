import { withTimeout } from './with-timeout';

describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the value when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toEqual({ timedOut: false, value: 42 });
  });

  it('times out when the promise never settles', async () => {
    const result = withTimeout(new Promise<number>(() => undefined), 1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toEqual({ timedOut: true });
  });

  it('treats a rejection as a timeout instead of throwing', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000)).resolves.toEqual({ timedOut: true });
  });

  it('clears its timer once the promise settles', async () => {
    await withTimeout(Promise.resolve(1), 1000);
    expect(vi.getTimerCount()).toBe(0);
  });
});
