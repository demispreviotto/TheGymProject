import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CountdownTimerService } from '../../../core/timer/countdown-timer.service';
import { AppIconComponent } from '../../ui/icons/app-icon.component';

@Component({
  selector: 'app-countdown-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIconComponent],
  styles: [`
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.15; }
    }
    .blinking { animation: blink 0.6s ease-in-out infinite; }
  `],
  template: `
    @if (timer.isActive()) {
      @if (timer.isFullscreen()) {
        <!-- Fullscreen overlay -->
        <div
          class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          (click)="timer.toggle()"
        >
          <div
            class="flex flex-col items-center gap-6 select-none"
            (click)="$event.stopPropagation()"
          >
            <span
              [class]="'text-[6rem] font-bold leading-none tabular-nums text-neutral-100' + (timer.isBlinking() ? ' blinking' : '')"
            >
              {{ formatted() }}
            </span>
            <p class="text-xs text-neutral-500 uppercase tracking-widest">Rest timer · tap outside to minimise</p>
            <button
              (click)="timer.cancel()"
              class="flex items-center gap-2 px-5 py-2 rounded-full border border-neutral-700 text-sm text-neutral-400 hover:text-neutral-100 hover:border-neutral-500 transition-colors"
            >
              <app-icon name="x-mark" iconClass="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>

      } @else {
        <!-- Toast -->
        <div
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-full bg-neutral-800 border border-neutral-700 shadow-xl cursor-pointer select-none"
          (click)="timer.toggle()"
        >
          <app-icon name="timer" iconClass="w-4 h-4 text-neutral-400" />
          <span
            [class]="'text-base font-bold tabular-nums text-neutral-100' + (timer.isBlinking() ? ' blinking' : '')"
          >
            {{ formatted() }}
          </span>
          <span class="text-xs text-neutral-500">tap to expand</span>
          <button
            (click)="$event.stopPropagation(); timer.cancel()"
            class="ml-1 p-1 rounded-full hover:bg-neutral-700 transition-colors"
            aria-label="Cancel timer"
          >
            <app-icon name="x-mark" iconClass="w-3 h-3 text-neutral-500" />
          </button>
        </div>
      }
    }
  `,
})
export class CountdownTimerComponent {
  readonly timer = inject(CountdownTimerService);

  formatted(): string {
    const s = this.timer.secondsLeft() ?? 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }
}
