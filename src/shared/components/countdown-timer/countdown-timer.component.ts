import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CountdownTimerService } from '../../../core/timer/countdown-timer.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AppIconComponent } from '../../ui/icons/app-icon.component';

@Component({
  selector: 'app-countdown-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIconComponent, TranslatePipe],
  styles: [`
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.15; }
    }
    .blinking { animation: blink 0.6s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .blinking { animation: none; opacity: 0.6; }
    }
  `],
  template: `
    @if (timer.isActive()) {
      @if (timer.isFullscreen()) {
        <!-- Fullscreen overlay: the rest is the only action right now -->
        <div
          class="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/90 px-4 backdrop-blur-sm"
          (click)="timer.toggle()"
        >
          <div
            class="flex w-full max-w-sm flex-col items-center gap-8 select-none"
            (click)="$event.stopPropagation()"
          >
            <div class="flex flex-col items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                {{ 'timer.rest' | translate }}
              </span>
              <span
                [class]="'text-[6rem] font-bold leading-none tracking-tight tabular-nums text-neutral-100' + (timer.isBlinking() ? ' blinking' : '')"
              >
                {{ formatted() }}
              </span>
            </div>

            <div class="grid w-full grid-cols-2 gap-3">
              <button
                type="button"
                (click)="extend()"
                [attr.aria-label]="'timer.extend.aria' | translate"
                class="flex h-12 items-center justify-center gap-2 rounded-xl bg-neutral-800 text-base font-semibold text-neutral-100 transition active:scale-95 hover:bg-neutral-700"
              >
                <app-icon name="plus" iconClass="w-4 h-4 fill-current" />
                {{ extendSeconds }}s
              </button>
              <button
                type="button"
                (click)="timer.cancel()"
                class="flex h-12 items-center justify-center gap-2 rounded-xl border border-neutral-700 text-base font-medium text-neutral-400 transition active:scale-95 hover:border-neutral-500 hover:text-neutral-100"
              >
                <app-icon name="x-mark" iconClass="w-4 h-4 fill-current" />
                {{ 'common.cancel' | translate }}
              </button>
            </div>

            <p class="text-xs text-neutral-500">{{ 'timer.hint' | translate }}</p>
          </div>
        </div>

      } @else {
        <!-- Minimised toast -->
        <div
          class="fixed bottom-6 left-1/2 z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 cursor-pointer select-none items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/95 py-2 pl-4 pr-2 shadow-xl backdrop-blur-md"
          (click)="timer.toggle()"
        >
          <app-icon name="timer" iconClass="w-4 h-4 flex-shrink-0 fill-current text-neutral-400" />
          <span
            [class]="'text-lg font-bold tabular-nums text-neutral-100' + (timer.isBlinking() ? ' blinking' : '')"
          >
            {{ formatted() }}
          </span>
          <span class="hidden text-xs text-neutral-500 sm:inline">{{ 'timer.expand' | translate }}</span>
          <button
            type="button"
            (click)="$event.stopPropagation(); extend()"
            [attr.aria-label]="'timer.extend.aria' | translate"
            class="flex h-11 min-w-12 items-center justify-center rounded-xl bg-neutral-800 px-3 text-sm font-semibold text-neutral-100 transition active:scale-95 hover:bg-neutral-700"
          >
            +{{ extendSeconds }}s
          </button>
          <button
            type="button"
            (click)="$event.stopPropagation(); timer.cancel()"
            [attr.aria-label]="'timer.cancel.aria' | translate"
            class="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-500 transition active:scale-95 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <app-icon name="x-mark" iconClass="w-4 h-4 fill-current" />
          </button>
        </div>
      }
    }
  `,
})
export class CountdownTimerComponent {
  readonly timer = inject(CountdownTimerService);

  /** Seconds added by the "+30s" button. */
  readonly extendSeconds = 30;

  formatted(): string {
    const s = this.timer.secondsLeft() ?? 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  extend(): void {
    this.timer.extend(this.extendSeconds);
  }
}
