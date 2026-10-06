import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { CountdownTimerService } from './countdown-timer.service';

describe('CountdownTimerService', () => {
  let service: CountdownTimerService;
  let sentinel: { release: jasmine.Spy; addEventListener: jasmine.Spy };
  let request: jasmine.Spy;
  let hadWakeLock: boolean;
  let originalDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    sentinel = { release: jasmine.createSpy('release').and.resolveTo(), addEventListener: jasmine.createSpy() };
    request = jasmine.createSpy('request').and.resolveTo(sentinel);
    hadWakeLock = 'wakeLock' in navigator;
    originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'wakeLock');
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    service = TestBed.inject(CountdownTimerService);
  });

  afterEach(() => {
    service.cancel();
    if (originalDescriptor) Object.defineProperty(navigator, 'wakeLock', originalDescriptor);
    else if (!hadWakeLock) delete (navigator as unknown as Record<string, unknown>)['wakeLock'];
  });

  it('is inactive initially', () => {
    expect(service.secondsLeft()).toBeNull();
    expect(service.isActive()).toBeFalse();
    expect(service.isBlinking()).toBeFalse();
  });

  it('start sets the duration, activates and opens fullscreen', fakeAsync(() => {
    service.toggle();
    service.start(30);
    expect(service.secondsLeft()).toBe(30);
    expect(service.isActive()).toBeTrue();
    expect(service.isFullscreen()).toBeTrue();
    service.cancel();
    flushMicrotasks();
  }));

  it('counts down once per second and finishes by itself', fakeAsync(() => {
    service.start(3);
    tick(1000);
    expect(service.secondsLeft()).toBe(2);
    tick(1000);
    expect(service.secondsLeft()).toBe(1);
    tick(1000);
    expect(service.secondsLeft()).toBeNull();
    expect(service.isActive()).toBeFalse();
    flushMicrotasks();
  }));

  it('blinks only during the last 5 seconds', fakeAsync(() => {
    service.start(7);
    expect(service.isBlinking()).toBeFalse();
    tick(1000); // 6
    expect(service.isBlinking()).toBeFalse();
    tick(1000); // 5
    expect(service.isBlinking()).toBeTrue();
    service.cancel();
    flushMicrotasks();
  }));

  it('cancel stops the interval and clears state', fakeAsync(() => {
    service.start(10);
    service.cancel();
    expect(service.secondsLeft()).toBeNull();
    tick(5000);
    expect(service.secondsLeft()).toBeNull();
    flushMicrotasks();
  }));

  it('starting a new timer replaces the previous one (no double ticking)', fakeAsync(() => {
    service.start(10);
    tick(2000);
    service.start(20);
    tick(1000);
    expect(service.secondsLeft()).toBe(19);
    service.cancel();
    flushMicrotasks();
  }));

  it('toggle flips fullscreen', () => {
    expect(service.isFullscreen()).toBeTrue();
    service.toggle();
    expect(service.isFullscreen()).toBeFalse();
    service.toggle();
    expect(service.isFullscreen()).toBeTrue();
  });

  describe('wake lock', () => {
    it('requests a screen lock on start and releases it on cancel', fakeAsync(() => {
      service.start(10);
      flushMicrotasks();
      expect(request).toHaveBeenCalledOnceWith('screen');
      service.cancel();
      expect(sentinel.release).toHaveBeenCalled();
    }));

    it('releases a lock that resolves after the timer was already cancelled', fakeAsync(() => {
      service.start(10);
      service.cancel();
      flushMicrotasks();
      expect(sentinel.release).toHaveBeenCalled();
    }));

    it('keeps counting when the wake lock request is rejected', fakeAsync(() => {
      request.and.rejectWith(new Error('denied'));
      service.start(5);
      flushMicrotasks();
      tick(1000);
      expect(service.secondsLeft()).toBe(4);
      service.cancel();
    }));
  });
});
