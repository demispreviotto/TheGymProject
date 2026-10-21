import { Component, computed, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ExigenceBadgeComponent } from '../../../../shared/components/exigence-badge/exigence-badge.component';
import { MuscleChipsComponent } from '../../../../shared/components/muscle-chips/muscle-chips.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../../shared/ui/icons/app-icon.component';
import {
  completedRounds, currentRound, isRowCompleted, lastDoneRound, suggestionSource, topWeight,
} from '../../../../core/workout/workout-stats';
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

          <app-set-inputs
            [row]="row()"
            (inputChange)="inputChange.emit($event)"
            (undoRound)="undoRound.emit($event)"
          />

          <div class="space-y-1">
            @if (completed()) {
              <button
                type="button"
                (click)="undoRound.emit(lastDone())"
                [attr.aria-label]="'dashboard.undoround' | translate"
                [class]="doneClass"
              >
                <app-icon name="check" iconClass="w-5 h-5 fill-current" />
                {{ 'dashboard.completed' | translate }}
              </button>
            } @else {
              <button type="button" (click)="completeSet.emit()" [class]="pendingClass">
                <app-icon name="check" iconClass="w-5 h-5 fill-current" />
                <span class="tabular-nums">{{ 'dashboard.completeround' | translate }} {{ current() + 1 }}/{{ rounds() }}</span>
                @if (restFollows()) {
                  <span class="flex items-center gap-1 tabular-nums opacity-80">
                    <span aria-hidden="true">·</span>
                    <app-icon name="timer" iconClass="w-4 h-4 fill-current" />
                    {{ row().prescribed.rest_time_minutes }} min
                  </span>
                }
              </button>
              @if (isStandard() && doneCount() > 0) {
                <button
                  type="button"
                  (click)="undoRound.emit(lastDone())"
                  class="flex h-11 w-full items-center justify-center rounded-xl text-xs font-semibold text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
                >
                  {{ 'dashboard.undoround' | translate }}
                </button>
              }
            }
          </div>
        </div>

      } @else {
        <button
          type="button"
          (click)="expand.emit()"
          aria-expanded="false"
          [attr.aria-label]="name() + ', ' + summary() + (completed() ? ', ' + ('dashboard.completed' | translate) : '')"
          class="flex min-h-16 w-full items-center justify-between gap-3 rounded-xl p-4 text-left transition-colors hover:bg-neutral-800/40 active:bg-neutral-800"
        >
          <span class="flex min-w-0 items-center gap-3">
            <span [class]="stateIconClass()">
              <app-icon [name]="completed() ? 'checks' : 'barbell'" iconClass="w-5 h-5 fill-current" />
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
  private readonly lang = inject(LanguageService);

  readonly row = input.required<WorkoutRowState>();
  readonly expanded = input.required<boolean>();
  readonly usesAutoRm = input(false);
  /** True while a rest timer is running: only one timer can run at a time. */
  readonly timerBusy = input(false);

  /** The user tapped a collapsed card. */
  readonly expand = output<void>();
  readonly inputChange = output<InputChange>();
  /** The user finished the current round. */
  readonly completeSet = output<void>();
  /** The user asked to reopen a finished round (by index). */
  readonly undoRound = output<number>();
  readonly timerStart = output<void>();

  readonly pendingClass = ACTION_PENDING;
  readonly doneClass = ACTION_DONE;

  readonly domId = computed(() => exerciseCardDomId(this.row().prescribed.id));
  readonly name = computed(() => this.row().prescribed.exercise?.name ?? 'Exercise');
  readonly source = computed(() => suggestionSource(this.row(), this.usesAutoRm()));

  readonly completed = computed(() => isRowCompleted(this.row()));
  readonly current = computed(() => currentRound(this.row()));
  readonly lastDone = computed(() => lastDoneRound(this.row()));
  readonly doneCount = computed(() => completedRounds(this.row()));
  readonly rounds = computed(() => this.row().roundsDone.length);
  readonly isStandard = computed(() => this.row().prescribed.tracking_mode === 'standard');

  /** A rest follows this round: it is not the last one and the plan prescribes a rest. */
  readonly restFollows = computed(
    () => this.current() < this.rounds() - 1 && this.row().prescribed.rest_time_minutes > 0,
  );

  readonly stateIconClass = computed(() =>
    `${STATE_ICON_BASE} ${this.completed() ? 'bg-green-500/15 text-green-400' : 'bg-neutral-800 text-neutral-400'}`,
  );

  /** "4 × 8 · 70 kg" when untouched or done, "2/4 rounds · 70 kg" while in progress. */
  readonly summary = computed(() => {
    const row = this.row();
    const weight = topWeight(row);
    const inProgress = this.doneCount() > 0 && !this.completed();
    const scheme = inProgress
      ? `${this.doneCount()}/${this.rounds()} ${this.lang.t('dashboard.rounds')}`
      : `${row.prescribed.rounds} × ${row.prescribed.target_reps}`;
    return weight === null ? scheme : `${scheme} · ${weight} kg`;
  });
}
