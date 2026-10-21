import { DecimalPipe } from '@angular/common';
import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../../shared/ui/icons/app-icon.component';
import { formatDuration } from '../../../../shared/utils/format';
import type { DayPosition } from '../../../../core/workout/workout-stats';

/** Progress card at the top of the workout: plan, day, completion bar and session volume. */
@Component({
  selector: 'app-workout-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIconComponent, DecimalPipe, TranslatePipe],
  host: { class: 'block' },
  template: `
    <section class="rounded-xl bg-neutral-900 p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="h-2 w-2 flex-shrink-0 rounded-full bg-tenant-primary"
              [class.animate-pulse]="!isDone()"
            ></span>
            <span class="truncate text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {{ 'dashboard.day' | translate }} {{ dayPosition().position }}
              {{ 'dashboard.of' | translate }} {{ dayPosition().total }}
            </span>
          </div>
          <h2 class="mt-0.5 line-clamp-2 break-words text-xl font-semibold leading-tight tracking-tight text-neutral-100">{{ title() }}</h2>
        </div>

        <span class="flex flex-shrink-0 items-center gap-1 rounded-full bg-neutral-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-100">
          <app-icon [name]="isDone() ? 'check' : 'bolt'" iconClass="w-4 h-4 fill-current text-tenant-primary" />
          {{ (isDone() ? 'dashboard.completed' : 'common.active') | translate }}
        </span>
      </div>

      <div class="mt-4 space-y-1.5">
        <div class="flex items-center justify-between text-xs">
          <span class="text-neutral-500">{{ 'dashboard.progress' | translate }}</span>
          <span class="font-semibold tabular-nums text-neutral-100">
            {{ completed() }} {{ 'dashboard.of' | translate }} {{ total() }}
            {{ 'dashboard.progress.done' | translate }} ({{ percent() }}%)
          </span>
        </div>
        <div
          class="h-2 w-full overflow-hidden rounded-full bg-neutral-800"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          [attr.aria-valuenow]="percent()"
        >
          <div
            class="h-full rounded-full bg-tenant-primary transition-all duration-300"
            [style.width.%]="percent()"
          ></div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2">
        <div class="flex min-w-0 items-center gap-3 rounded-lg bg-neutral-800/60 p-2.5">
          <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-neutral-400">
            <app-icon name="barbell" iconClass="w-[18px] h-[18px]" />
          </span>
          <div class="flex min-w-0 flex-col">
            <span class="truncate text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              {{ 'dashboard.volume' | translate }}
            </span>
            <span class="truncate text-sm font-semibold tabular-nums text-neutral-100">
              {{ volume() | number: '1.0-1' }} kg
            </span>
          </div>
        </div>

        <div class="flex min-w-0 items-center gap-3 rounded-lg bg-neutral-800/60 p-2.5">
          <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-neutral-400">
            <app-icon name="timer" iconClass="w-[18px] h-[18px] fill-current" />
          </span>
          <div class="flex min-w-0 flex-col">
            <span class="truncate text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              {{ 'dashboard.duration' | translate }}
            </span>
            <span class="truncate text-sm font-semibold tabular-nums text-neutral-100">{{ durationLabel() }}</span>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class WorkoutSummaryComponent {
  readonly title = input.required<string>();
  readonly dayPosition = input.required<DayPosition>();
  readonly completed = input.required<number>();
  readonly total = input.required<number>();
  readonly percent = input.required<number>();
  readonly volume = input.required<number>();
  readonly durationSeconds = input.required<number>();

  readonly isDone = computed(() => this.total() > 0 && this.completed() >= this.total());
  readonly durationLabel = computed(() => formatDuration(this.durationSeconds()));
}
