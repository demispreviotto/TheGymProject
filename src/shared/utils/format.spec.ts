import { formatDuration } from './format';

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(28 * 60 + 14)).toBe('28:14');
  });

  it('adds hours once it passes 60 minutes', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3600 + 5 * 60 + 9)).toBe('1:05:09');
  });

  it('drops fractions of a second', () => {
    expect(formatDuration(59.9)).toBe('0:59');
  });

  it('reads 0:00 for negative or invalid input', () => {
    expect(formatDuration(-5)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
    expect(formatDuration(Infinity)).toBe('0:00');
  });
});
