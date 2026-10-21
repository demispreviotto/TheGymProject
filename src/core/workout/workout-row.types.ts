import type { WorkoutPrescribed } from './workout.service';

/** Weight/reps entered for one round (or, in standard mode, the single pair shared by all rounds). */
export interface RoundInput {
  weight: number | null;
  reps: number | null;
}

export type RoundInputField = 'weight' | 'reps';

/** A single edit made by the user inside an exercise card. */
export interface InputChange {
  roundIndex: number;
  field: RoundInputField;
  value: number | null;
}

/** One exercise of the active day as tracked on the workout dashboard. */
export interface WorkoutRowState {
  prescribed: WorkoutPrescribed;
  suggestedWeight: number | null;
  inputs: RoundInput[];
  isCompleted: boolean;
}
