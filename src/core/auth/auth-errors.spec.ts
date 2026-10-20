import { isServiceUnavailable } from './auth-errors';

describe('isServiceUnavailable', () => {
  it('is true for supabase-js retryable fetch errors (gateway / network)', () => {
    expect(isServiceUnavailable({ name: 'AuthRetryableFetchError', status: 504, message: '{}' })).toBe(true);
    expect(isServiceUnavailable({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' })).toBe(true);
  });

  it('is true for any 5xx status', () => {
    expect(isServiceUnavailable({ status: 500, message: 'boom' })).toBe(true);
    expect(isServiceUnavailable({ status: 503, message: 'down' })).toBe(true);
  });

  it('is false for rejected input (4xx) and errors without a status', () => {
    expect(isServiceUnavailable({ name: 'AuthApiError', status: 400, message: 'Invalid login credentials' })).toBe(false);
    expect(isServiceUnavailable({ status: 429, message: 'rate limited' })).toBe(false);
    expect(isServiceUnavailable({ message: 'something else' })).toBe(false);
  });
});
