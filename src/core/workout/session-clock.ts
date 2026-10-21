import { Injectable, OnDestroy, signal } from '@angular/core';

/**
 * Elapsed time of the workout in progress. It starts on the user's first action and is provided
 * per dashboard (not a root singleton), so it is destroyed, and its interval cleared, with the page.
 * Elapsed time is derived from the wall clock, so a throttled background tab catches up on the next tick.
 */
@Injectable()
export class SessionClock implements OnDestroy {
  readonly elapsedSeconds = signal(0);

  private startedAt: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /** Starts counting; calling it again while running keeps the original start time. */
  start(): void {
    if (this.startedAt !== null) return;
    this.startedAt = Date.now();
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  /** Stops counting and goes back to zero (a new workout is loaded). */
  reset(): void {
    this.stop();
    this.startedAt = null;
    this.elapsedSeconds.set(0);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private tick(): void {
    if (this.startedAt === null) return;
    this.elapsedSeconds.set(Math.floor((Date.now() - this.startedAt) / 1000));
  }

  private stop(): void {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}
