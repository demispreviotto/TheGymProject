import { TestBed } from '@angular/core/testing';
import { SessionClock } from './session-clock';

describe('SessionClock', () => {
  let clock: SessionClock;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [SessionClock] });
    clock = TestBed.inject(SessionClock);
  });

  afterEach(() => {
    clock.ngOnDestroy();
    vi.useRealTimers();
  });

  it('stays at zero until started', () => {
    vi.advanceTimersByTime(5000);
    expect(clock.elapsedSeconds()).toBe(0);
  });

  it('counts the seconds since the first start', () => {
    clock.start();
    vi.advanceTimersByTime(3000);
    expect(clock.elapsedSeconds()).toBe(3);
    vi.advanceTimersByTime(62000);
    expect(clock.elapsedSeconds()).toBe(65);
  });

  it('keeps the original start time when started again', () => {
    clock.start();
    vi.advanceTimersByTime(4000);
    clock.start();
    vi.advanceTimersByTime(1000);
    expect(clock.elapsedSeconds()).toBe(5);
  });

  it('does not run more than one interval', () => {
    clock.start();
    clock.start();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('catches up from the wall clock after a stalled tick', () => {
    clock.start();
    vi.setSystemTime(Date.now() + 90_000); // tab was frozen; the next tick sees the real time
    vi.advanceTimersByTime(1000);
    expect(clock.elapsedSeconds()).toBeGreaterThanOrEqual(90);
  });

  it('reset stops the clock, clears the interval and can start fresh', () => {
    clock.start();
    vi.advanceTimersByTime(7000);
    clock.reset();
    expect(clock.elapsedSeconds()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);

    clock.start();
    vi.advanceTimersByTime(2000);
    expect(clock.elapsedSeconds()).toBe(2);
  });

  it('clears the interval when destroyed', () => {
    clock.start();
    clock.ngOnDestroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
