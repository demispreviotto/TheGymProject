import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { StepperComponent } from '../../../../shared/components/stepper/stepper.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { InputChange, RoundInputField, WorkoutRowState } from '../../../../core/workout/workout-row.types';

const WEIGHT_STEP_KG = 2.5;
const REPS_STEP = 1;

/**
 * Weight / reps entry for one exercise. Standard mode shows a single pair that applies to
 * every round; granular and failure modes show one pair per round. Purely presentational:
 * every edit is emitted as an InputChange and the parent owns the state.
 */
@Component({
  selector: 'app-set-inputs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepperComponent, TranslatePipe],
  host: { class: 'block' },
  template: `
    @if (row().prescribed.tracking_mode === 'standard') {
      <div class="space-y-2 rounded-xl bg-neutral-800/50 p-2">
        <p class="px-1 text-xs text-neutral-500">
          {{ 'dashboard.target' | translate }}:
          <span class="tabular-nums text-neutral-300">{{ row().prescribed.rounds }} × {{ row().prescribed.target_reps }}</span>
          · {{ 'dashboard.allrounds' | translate }}
        </p>
        <div class="grid grid-cols-2 gap-2">
          <app-stepper
            [label]="'dashboard.weight' | translate"
            [value]="row().inputs[0].weight"
            [step]="weightStep"
            [placeholder]="row().suggestedWeight"
            [disabled]="row().isCompleted"
            (valueChange)="change(0, 'weight', $event)"
          />
          <app-stepper
            [label]="'dashboard.reps' | translate"
            [value]="row().inputs[0].reps"
            [step]="repsStep"
            [placeholder]="row().prescribed.target_reps"
            [disabled]="row().isCompleted"
            (valueChange)="change(0, 'reps', $event)"
          />
        </div>
      </div>

    } @else {
      <div class="space-y-2">
        @for (input of row().inputs; track $index; let r = $index) {
          <div class="space-y-2 rounded-xl bg-neutral-800/50 p-2">
            <p class="px-1 text-xs font-semibold text-neutral-500">
              {{ 'dashboard.round' | translate }} {{ r + 1 }}
            </p>
            <div class="grid grid-cols-2 gap-2">
              <app-stepper
                [label]="'dashboard.weight' | translate"
                [value]="input.weight"
                [step]="weightStep"
                [placeholder]="row().suggestedWeight"
                [disabled]="row().isCompleted"
                (valueChange)="change(r, 'weight', $event)"
              />
              <app-stepper
                [label]="'dashboard.reps' | translate"
                [value]="input.reps"
                [step]="repsStep"
                [placeholder]="row().prescribed.target_reps"
                [disabled]="row().isCompleted"
                (valueChange)="change(r, 'reps', $event)"
              />
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class SetInputsComponent {
  readonly row = input.required<WorkoutRowState>();

  readonly inputChange = output<InputChange>();

  readonly weightStep = WEIGHT_STEP_KG;
  readonly repsStep = REPS_STEP;

  change(roundIndex: number, field: RoundInputField, value: number | null): void {
    this.inputChange.emit({ roundIndex, field, value });
  }
}
