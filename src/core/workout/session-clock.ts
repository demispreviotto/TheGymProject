import { Injectable, OnDestroy, signal } from '@angular/core';

/**
 * Elapsed time of the workout in progress. It starts on the user's first action and is provided
 * per dashboard (not a root singleton), so it is destroyed, and its interval cleared, with the page.
 * Elapsed time is derived from the wall clock, so a throttled background tab catches up on the next
 * tick, and a session restored from a draft carries on from its original start.
 */
@Injectable()
export class SessionClock implements OnDestroy {
  readonly elapsedSeconds = signal(0);

  /** Wall-clock start of the session (ms), or null before it started. Saved in the workout draft. */
  readonly startedAt = signal<number | null>(null);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Starts counting, from `from` when restoring a session. Calling it again while running keeps the
   * original start time.
   */
  start(from: number = Date.now()): void {
    if (this.startedAt() !== null) return;
    this.startedAt.set(from);
    this.tick();
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  /** Stops counting and goes back to zero (a new workout is loaded). */
  reset(): void {
    this.stop();
    this.startedAt.set(null);
    this.elapsedSeconds.set(0);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private tick(): void {
    const startedAt = this.startedAt();
    if (startedAt === null) return;
    this.elapsedSeconds.set(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
  }

  private stop(): void {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}
