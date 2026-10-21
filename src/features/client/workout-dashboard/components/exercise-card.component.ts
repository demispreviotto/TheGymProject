import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ExigenceBadgeComponent } from '../../../../shared/components/exigence-badge/exigence-badge.component';
import { MuscleChipsComponent } from '../../../../shared/components/muscle-chips/muscle-chips.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../../shared/ui/icons/app-icon.component';
import { suggestionSource, topWeight } from '../../../../core/workout/workout-stats';
import type { InputChange, WorkoutRowState } from '../../../../core/workout/workout-row.types';
import { SetInputsComponent } from './set-inputs.component';
import { SuggestionChipComponent } from './suggestion-chip.component';

/** DOM id of a card, so the dashboard can scroll the opened one into view. */
export function exerciseCardDomId(prescribedId: string): string {
  return `exercise-card-${prescribedId}`;
}

const ACTION_BASE = 'flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.98]';
const ACTION_PENDING = `${ACTION_BASE} bg-tenant-primary text-tenant-contrast hover:bg-tenant-hover`;
const ACTION_DONE = `${ACTION_BASE} bg-green-500/15 text-green-400 hover:bg-green-500/25`;

const STATE_ICON_BASE = 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full';

/**
 * One exercise of the workout. Open: full detail with inputs. Closed: a one-line row, either
 * done (green check) or pending (barbell). The dashboard decides which card is open and owns
 * all state; this component only renders it and reports what the user did.
 */
@Component({
  selector: 'app-exercise-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppIconComponent,
    ExigenceBadgeComponent,
    MuscleChipsComponent,
    SetInputsComponent,
    SuggestionChipComponent,
    TranslatePipe,
  ],
  host: { class: 'block scroll-mt-[4.5rem]', '[attr.id]': 'domId()' },
  template: `
    <article class="rounded-xl bg-neutral-900 transition-colors" [class.ring-1]="expanded()" [class.ring-neutral-800]="expanded()">
      @if (expanded()) {
        <div class="space-y-4 p-4">
          <div class="space-y-3">
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="truncate text-lg font-semibold leading-tight text-neutral-100">{{ name() }}</h3>
                  <app-exigence-badge [level]="row().prescribed.exigence" />
                </div>
                <p class="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-neutral-500">
                  {{ row().prescribed.rounds }} × {{ row().prescribed.target_reps }}
                  <span aria-hidden="true">·</span>
                  <app-icon name="timer" iconClass="w-3.5 h-3.5 fill-current" />
                  {{ row().prescribed.rest_time_minutes }} min
                </p>
              </div>
              <button
                type="button"
                (click)="timerStart.emit()"
                [disabled]="timerBusy()"
                [attr.aria-label]="'dashboard.timer.start' | translate"
                [title]="'dashboard.timer.start' | translate"
                class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <app-icon name="timer" iconClass="w-5 h-5 fill-current" />
              </button>
            </div>

            <app-muscle-chips [muscles]="row().prescribed.exercise?.muscle_groups ?? []" />

            @if (row().suggestedWeight !== null) {
              <app-suggestion-chip [weight]="row().suggestedWeight ?? 0" [source]="source()" />
            }
          </div>

          <app-set-inputs [row]="row()" (inputChange)="inputChange.emit($event)" />

          <button type="button" (click)="completeToggle.emit()" [class]="actionClass()">
            <app-icon name="check" iconClass="w-5 h-5 fill-current" />
            {{ (row().isCompleted ? 'dashboard.completed' : 'dashboard.complete') | translate }}
          </button>
        </div>

      } @else {
        <button
          type="button"
          (click)="expand.emit()"
          aria-expanded="false"
          [attr.aria-label]="name() + ', ' + summary() + (row().isCompleted ? ', ' + ('dashboard.completed' | translate) : '')"
          class="flex min-h-16 w-full items-center justify-between gap-3 rounded-xl p-4 text-left transition-colors hover:bg-neutral-800/40 active:bg-neutral-800"
        >
          <span class="flex min-w-0 items-center gap-3">
            <span [class]="stateIconClass()">
              <app-icon [name]="row().isCompleted ? 'checks' : 'barbell'" iconClass="w-5 h-5 fill-current" />
            </span>
            <span class="min-w-0">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm font-semibold text-neutral-100">{{ name() }}</span>
                <app-exigence-badge [level]="row().prescribed.exigence" />
              </span>
              <span class="block truncate text-xs tabular-nums text-neutral-500">{{ summary() }}</span>
            </span>
          </span>
          <app-icon name="chevron-down" iconClass="w-5 h-5 flex-shrink-0 fill-current text-neutral-500" />
        </button>
      }
    </article>
  `,
})
export class ExerciseCardComponent {
  readonly row = input.required<WorkoutRowState>();
  readonly expanded = input.required<boolean>();
  readonly usesAutoRm = input(false);
  /** True while a rest timer is running: only one timer can run at a time. */
  readonly timerBusy = input(false);

  /** The user tapped a collapsed card. */
  readonly expand = output<void>();
  readonly inputChange = output<InputChange>();
  readonly completeToggle = output<void>();
  readonly timerStart = output<void>();

  readonly domId = computed(() => exerciseCardDomId(this.row().prescribed.id));
  readonly name = computed(() => this.row().prescribed.exercise?.name ?? 'Exercise');
  readonly source = computed(() => suggestionSource(this.row(), this.usesAutoRm()));

  readonly actionClass = computed(() => (this.row().isCompleted ? ACTION_DONE : ACTION_PENDING));

  readonly stateIconClass = computed(() =>
    `${STATE_ICON_BASE} ${this.row().isCompleted ? 'bg-green-500/15 text-green-400' : 'bg-neutral-800 text-neutral-400'}`,
  );

  /** "4 × 8 · 70 kg": the weight actually lifted once done, the suggestion while pending. */
  readonly summary = computed(() => {
    const row = this.row();
    const weight = row.isCompleted ? topWeight(row) : row.suggestedWeight;
    const scheme = `${row.prescribed.rounds} × ${row.prescribed.target_reps}`;
    return weight === null ? scheme : `${scheme} · ${weight} kg`;
  });
}
