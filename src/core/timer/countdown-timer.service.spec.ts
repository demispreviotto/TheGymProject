import { TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { CountdownTimerService } from './countdown-timer.service';

describe('CountdownTimerService', () => {
  let service: CountdownTimerService;
  let sentinel: { release: Mock; addEventListener: Mock };
  let request: Mock;
  let hadWakeLock: boolean;
  let originalDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    sentinel = { release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() };
    request = vi.fn().mockResolvedValue(sentinel);
    hadWakeLock = 'wakeLock' in navigator;
    originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'wakeLock');
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    service = TestBed.inject(CountdownTimerService);
  });

  afterEach(() => {
    service.cancel();
    vi.useRealTimers();
    if (originalDescriptor) Object.defineProperty(navigator, 'wakeLock', originalDescriptor);
    else if (!hadWakeLock) delete (navigator as unknown as Record<string, unknown>)['wakeLock'];
  });

  it('is inactive initially', () => {
    expect(service.secondsLeft()).toBeNull();
    expect(service.isActive()).toBe(false);
    expect(service.isBlinking()).toBe(false);
  });

  it('start sets the duration, activates and opens fullscreen', async () => {
    service.toggle();
    service.start(30);
    expect(service.secondsLeft()).toBe(30);
    expect(service.isActive()).toBe(true);
    expect(service.isFullscreen()).toBe(true);
    service.cancel();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('counts down once per second and finishes by itself', async () => {
    service.start(3);
    await vi.advanceTimersByTimeAsync(1000);
    expect(service.secondsLeft()).toBe(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(service.secondsLeft()).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(service.secondsLeft()).toBeNull();
    expect(service.isActive()).toBe(false);
    await vi.advanceTimersByTimeAsync(0);
  });

  it('blinks only during the last 5 seconds', async () => {
    service.start(7);
    expect(service.isBlinking()).toBe(false);
    await vi.advanceTimersByTimeAsync(1000); // 6
    expect(service.isBlinking()).toBe(false);
    await vi.advanceTimersByTimeAsync(1000); // 5
    expect(service.isBlinking()).toBe(true);
    service.cancel();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('cancel stops the interval and clears state', async () => {
    service.start(10);
    service.cancel();
    expect(service.secondsLeft()).toBeNull();
    await vi.advanceTimersByTimeAsync(5000);
    expect(service.secondsLeft()).toBeNull();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('starting a new timer replaces the previous one (no double ticking)', async () => {
    service.start(10);
    await vi.advanceTimersByTimeAsync(2000);
    service.start(20);
    await vi.advanceTimersByTimeAsync(1000);
    expect(service.secondsLeft()).toBe(19);
    service.cancel();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('toggle flips fullscreen', () => {
    expect(service.isFullscreen()).toBe(true);
    service.toggle();
    expect(service.isFullscreen()).toBe(false);
    service.toggle();
    expect(service.isFullscreen()).toBe(true);
  });

  describe('extend', () => {
    it('adds time to a running timer', async () => {
      service.start(10);
      service.extend(30);
      expect(service.secondsLeft()).toBe(40);
      service.cancel();
      await vi.advanceTimersByTimeAsync(0);
    });

    it('is a no-op when no timer is running', () => {
      service.extend(30);
      expect(service.secondsLeft()).toBeNull();
      expect(service.isActive()).toBe(false);
    });

    it('ignores zero and negative amounts', async () => {
      service.start(10);
      service.extend(0);
      service.extend(-5);
      expect(service.secondsLeft()).toBe(10);
      service.cancel();
      await vi.advanceTimersByTimeAsync(0);
    });

    it('stops the blinking when it lifts the timer above 5 seconds', async () => {
      service.start(4);
      expect(service.isBlinking()).toBe(true);
      service.extend(30);
      expect(service.isBlinking()).toBe(false);
      service.cancel();
      await vi.advanceTimersByTimeAsync(0);
    });

    it('keeps counting down from the extended value on the same interval', async () => {
      service.start(10);
      await vi.advanceTimersByTimeAsync(2000); // 8
      service.extend(30); // 38
      await vi.advanceTimersByTimeAsync(1000);
      expect(service.secondsLeft()).toBe(37);
      service.cancel();
      await vi.advanceTimersByTimeAsync(0);
    });

    it('does not change the fullscreen / minimised state', async () => {
      service.start(10);
      service.toggle(); // minimise
      service.extend(30);
      expect(service.isFullscreen()).toBe(false);
      service.cancel();
      await vi.advanceTimersByTimeAsync(0);
    });
  });

  describe('wake lock', () => {
    it('requests a screen lock on start and releases it on cancel', async () => {
      service.start(10);
      await vi.advanceTimersByTimeAsync(0);
      expect(request).toHaveBeenCalledExactlyOnceWith('screen');
      service.cancel();
      expect(sentinel.release).toHaveBeenCalled();
    });

    it('releases a lock that resolves after the timer was already cancelled', async () => {
      service.start(10);
      service.cancel();
      await vi.advanceTimersByTimeAsync(0);
      expect(sentinel.release).toHaveBeenCalled();
    });

    it('keeps counting when the wake lock request is rejected', async () => {
      request.mockRejectedValue(new Error('denied'));
      service.start(5);
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1000);
      expect(service.secondsLeft()).toBe(4);
      service.cancel();
    });
  });
});
