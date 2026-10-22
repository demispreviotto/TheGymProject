import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { StepperComponent } from '../../../../shared/components/stepper/stepper.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../../shared/ui/icons/app-icon.component';
import { currentRound, isRowCompleted, roundStatus, type RoundStatus } from '../../../../core/workout/workout-stats';
import type { InputChange, RoundInputField, WorkoutRowState } from '../../../../core/workout/workout-row.types';

const WEIGHT_STEP_KG = 2.5;
const REPS_STEP = 1;

const DOT_BASE = 'h-1.5 flex-1 rounded-full transition-colors';
const CURRENT_ROUND = 'space-y-2 rounded-xl bg-neutral-800/50 p-2 ring-1 ring-tenant-primary/50';

/**
 * Weight / reps entry for one exercise. Standard mode shows a single pair that applies to every
 * round, with one progress dot per round. Granular and failure modes show only the current
 * round as full inputs; finished rounds are a one-line summary (their Edit button is parked, see the
 * template), and the rest wait as a dim line. Purely presentational: edits are emitted as InputChange,
 * a request to reopen a round as `undoRound`, and the parent owns the state.
 */
@Component({
  selector: 'app-set-inputs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIconComponent, StepperComponent, TranslatePipe],
  host: { class: 'block' },
  template: `
    @if (row().prescribed.tracking_mode === 'standard') {
      <div class="space-y-3 rounded-xl bg-neutral-800/50 p-2">
        <div class="space-y-1.5 px-1">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-semibold tabular-nums text-neutral-200">
              @if (allDone()) {
                {{ 'dashboard.alldone' | translate }}
              } @else {
                {{ 'dashboard.round' | translate }} {{ current() + 1 }} {{ 'dashboard.of' | translate }} {{ rounds() }}
              }
            </p>
            <p class="text-xs tabular-nums text-neutral-500">
              {{ 'dashboard.target' | translate }}: {{ rounds() }} × {{ row().prescribed.target_reps }}
            </p>
          </div>
          <div class="flex gap-1.5" aria-hidden="true">
            @for (done of row().roundsDone; track $index; let r = $index) {
              <span [class]="dotClass(r)"></span>
            }
          </div>
          <p class="text-xs text-neutral-500">{{ 'dashboard.allrounds' | translate }}</p>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <app-stepper
            [label]="'dashboard.weight' | translate"
            [value]="row().inputs[0].weight"
            [step]="weightStep"
            [placeholder]="row().suggestedWeight"
            [disabled]="allDone()"
            (valueChange)="change(0, 'weight', $event)"
          />
          <app-stepper
            [label]="'dashboard.reps' | translate"
            [value]="row().inputs[0].reps"
            [step]="repsStep"
            [placeholder]="row().prescribed.target_reps"
            [disabled]="allDone()"
            (valueChange)="change(0, 'reps', $event)"
          />
        </div>
      </div>

    } @else {
      <div class="space-y-2">
        @for (input of row().inputs; track $index; let r = $index) {
          @switch (status(r)) {
            @case ('current') {
              <div [class]="currentClass">
                <div class="flex min-h-9 items-center justify-between px-1">
                  <p class="text-xs font-semibold text-neutral-300">
                    {{ 'dashboard.round' | translate }} {{ r + 1 }} {{ 'dashboard.of' | translate }} {{ rounds() }}
                  </p>
                  <span class="text-[11px] font-bold uppercase tracking-wider text-tenant-primary">
                    {{ 'dashboard.current' | translate }}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <app-stepper
                    [label]="'dashboard.weight' | translate"
                    [value]="input.weight"
                    [step]="weightStep"
                    [placeholder]="row().suggestedWeight"
                    (valueChange)="change(r, 'weight', $event)"
                  />
                  <app-stepper
                    [label]="'dashboard.reps' | translate"
                    [value]="input.reps"
                    [step]="repsStep"
                    [placeholder]="row().prescribed.target_reps"
                    (valueChange)="change(r, 'reps', $event)"
                  />
                </div>
              </div>
            }
            @case ('done') {
              <div class="flex min-h-11 items-center gap-2 rounded-xl bg-green-500/10 px-3">
                <app-icon name="check" iconClass="w-4 h-4 flex-shrink-0 fill-current text-green-400" />
                <p class="flex-1 truncate text-xs tabular-nums text-neutral-300">
                  <span class="font-semibold text-neutral-200">{{ 'dashboard.round' | translate }} {{ r + 1 }}</span>
                  · {{ input.weight ?? 0 }} kg × {{ input.reps ?? 0 }}
                </p>
                <!-- Parked for a later phase: re-editing a finished round.
                <button
                  type="button"
                  (click)="undoRound.emit(r)"
                  [attr.aria-label]="'common.edit' | translate"
                  class="flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
                >
                  <app-icon name="pencil" iconClass="w-4 h-4" />
                  {{ 'common.edit' | translate }}
                </button>
                -->
              </div>
            }
            @default {
              <div class="flex min-h-9 items-center rounded-xl bg-neutral-800/30 px-3">
                <p class="truncate text-xs tabular-nums text-neutral-500">
                  {{ 'dashboard.round' | translate }} {{ r + 1 }}
                  · {{ input.weight ?? row().suggestedWeight ?? 0 }} kg × {{ input.reps ?? row().prescribed.target_reps }}
                </p>
              </div>
            }
          }
        }
      </div>
    }
  `,
})
export class SetInputsComponent {
  readonly row = input.required<WorkoutRowState>();

  readonly inputChange = output<InputChange>();
  /** The user asked to reopen this round. */
  readonly undoRound = output<number>();

  readonly currentClass = CURRENT_ROUND;
  readonly weightStep = WEIGHT_STEP_KG;
  readonly repsStep = REPS_STEP;

  readonly current = computed(() => currentRound(this.row()));
  readonly rounds = computed(() => this.row().roundsDone.length);
  readonly allDone = computed(() => isRowCompleted(this.row()));

  change(roundIndex: number, field: RoundInputField, value: number | null): void {
    this.inputChange.emit({ roundIndex, field, value });
  }

  dotClass(round: number): string {
    if (this.row().roundsDone[round]) return `${DOT_BASE} bg-tenant-primary`;
    return `${DOT_BASE} ${round === this.current() ? 'bg-tenant-primary/40' : 'bg-neutral-700'}`;
  }

  status(round: number): RoundStatus {
    return roundStatus(this.row(), round);
  }
}
