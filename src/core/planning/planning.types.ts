export type MuscleIntensity = 'primary' | 'secondary' | 'tertiary';
export type TrackingMode = 'standard' | 'granular' | 'failure';
export type ExigenceLevel = 'A' | 'B' | 'C' | 'D';

export interface MuscleGroup {
  name: string;
  intensity: MuscleIntensity;
}

export interface Exercise {
  id: string;
  tenant_id: string | null;
  name: string;
  definition: string | null;
  recommendations: string | null;
  muscle_groups: MuscleGroup[];
  created_at: string;
}

export interface Planning {
  id: string;
  tenant_id: string;
  title: string;
  use_auto_1rm: boolean;
  is_shared_with_gym: boolean;
  created_at: string;
}

export interface PlanningDay {
  id: string;
  planning_id: string;
  day_number: number;
}

export interface PrescribedExercise {
  id: string;
  planning_day_id: string;
  exercise_id: string;
  exigence: ExigenceLevel;
  rest_time_minutes: number;
  tracking_mode: TrackingMode;
  rounds: number;
  target_reps: number;
  suggested_first_weight: number | null;
  sorting_order: number;
  exercise?: Exercise;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  planning_id: string;
  day_number: number;
  completed_at: string;
  subjective_score: number | null;
}

export interface WorkoutLog {
  id: string;
  session_id: string;
  exercise_id: string;
  round_number: number;
  weight_used: number;
  reps_performed: number;
  is_completed: boolean;
}
