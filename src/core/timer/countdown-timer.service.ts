import { Injectable, signal, computed, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class CountdownTimerService {
  readonly secondsLeft = signal<number | null>(null);
  readonly isFullscreen = signal(true);

  readonly isActive = computed(() => this.secondsLeft() !== null);
  readonly isBlinking = computed(() => {
    const s = this.secondsLeft();
    return s !== null && s <= 5;
  });

  private readonly doc = inject(DOCUMENT);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private wakeLock: WakeLockSentinel | null = null;

  constructor() {
    this.doc.addEventListener('visibilitychange', () => {
      if (this.doc.visibilityState === 'visible' && this.isActive()) void this.requestWakeLock();
    });
  }

  start(durationSeconds: number): void {
    this.cancel();
    this.secondsLeft.set(durationSeconds);
    this.isFullscreen.set(true);
    void this.requestWakeLock();
    this.intervalId = setInterval(() => {
      const current = this.secondsLeft();
      if (current === null || current <= 1) {
        this.cancel();
        return;
      }
      this.secondsLeft.set(current - 1);
    }, 1000);
  }

  cancel(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.secondsLeft.set(null);
    this.releaseWakeLock();
  }

  private async requestWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator) || this.wakeLock !== null) return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (!this.isActive()) {
        void sentinel.release();
        return;
      }
      this.wakeLock = sentinel;
      sentinel.addEventListener('release', () => {
        if (this.wakeLock === sentinel) this.wakeLock = null;
      });
    } catch {
      this.wakeLock = null;
    }
  }

  private releaseWakeLock(): void {
    void this.wakeLock?.release();
    this.wakeLock = null;
  }

  toggle(): void {
    this.isFullscreen.update(v => !v);
  }
}
