import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CountdownTimerService {
  readonly secondsLeft = signal<number | null>(null);
  readonly isFullscreen = signal(true);

  readonly isActive = computed(() => this.secondsLeft() !== null);
  readonly isBlinking = computed(() => {
    const s = this.secondsLeft();
    return s !== null && s <= 5;
  });

  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(durationSeconds: number): void {
    this.cancel();
    this.secondsLeft.set(durationSeconds);
    this.isFullscreen.set(true);
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
  }

  toggle(): void {
    this.isFullscreen.update(v => !v);
  }
}
