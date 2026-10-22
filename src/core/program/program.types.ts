export interface Program {
  id: string;
  owner_id: string;
  title: string;
  is_shared_with_friends: boolean;
  is_shared_with_gym: boolean;
  created_at: string;
}

export interface ProgramPhase {
  id: string;
  program_id: string;
  planning_id: string;
  position: number;
  repeat_count: number;
}

/** A phase as edited in the builder: which plan, repeated how many weeks. */
export interface PhaseDraft {
  planning_id: string;
  repeat_count: number;
}

export type UserProgramStatus = 'active' | 'completed' | 'abandoned';

export interface UserProgram {
  id: string;
  user_id: string;
  program_id: string;
  status: UserProgramStatus;
  started_at: string;
}

/** A phase together with the day numbers its plan has, which is all position math needs. */
export interface PhaseSchedule {
  id: string;
  planning_id: string;
  position: number;
  repeat_count: number;
  days: readonly number[];
}

export interface ActiveProgram {
  userProgram: UserProgram;
  program: Program;
  phases: PhaseSchedule[];
  completedWorkouts: number;
}

export interface ProgramPosition {
  /** Phase the next workout belongs to; null once the program is finished. */
  phase: PhaseSchedule | null;
  /** 1-based repeat of the phase's plan (week number inside the phase). */
  cycleIndex: number;
  /** Day number of the next workout in the plan; null once finished. */
  dayNumber: number | null;
  /** 1-based position of that day in the plan's sorted day list. */
  dayPosition: number;
  completedWorkouts: number;
  totalWorkouts: number;
  isFinished: boolean;
}
