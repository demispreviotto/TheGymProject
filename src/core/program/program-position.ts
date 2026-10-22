import type { PhaseSchedule, PositionLabel, ProgramPosition } from './program.types';

const sortedDays = (phase: PhaseSchedule): number[] =>
  [...new Set(phase.days)].sort((a, b) => a - b);

const workoutsIn = (phase: PhaseSchedule): number =>
  phase.repeat_count * sortedDays(phase).length;

/** Total workouts a program asks for. Phases whose plan has no days add nothing. */
export function totalWorkouts(phases: readonly PhaseSchedule[]): number {
  return phases.reduce((sum, p) => sum + workoutsIn(p), 0);
}

/**
 * Where a user is in a program, derived from how many of its workouts they have logged.
 * Completion-based: finishing a workout advances, skipping a calendar day costs nothing.
 */
export function resolvePosition(
  phases: readonly PhaseSchedule[],
  completedWorkouts: number,
): ProgramPosition {
  const ordered = [...phases].sort((a, b) => a.position - b.position);
  const total = totalWorkouts(ordered);
  const done = Math.max(0, Math.floor(completedWorkouts));
  let remaining = done;

  for (const phase of ordered) {
    const days = sortedDays(phase);
    const size = workoutsIn(phase);
    if (remaining < size) {
      const dayIndex = remaining % days.length;
      return {
        phase,
        cycleIndex: Math.floor(remaining / days.length) + 1,
        dayNumber: days[dayIndex],
        dayPosition: dayIndex + 1,
        completedWorkouts: done,
        totalWorkouts: total,
        isFinished: false,
      };
    }
    remaining -= size;
  }

  return {
    phase: null,
    cycleIndex: 0,
    dayNumber: null,
    dayPosition: 0,
    completedWorkouts: Math.min(done, total),
    totalWorkouts: total,
    isFinished: true,
  };
}

/**
 * "Week 3 of 5, phase 1 of 2" for a position, or null once the program is finished.
 * Phases whose plan has no days are skipped, matching resolvePosition.
 */
export function describePosition(
  phases: readonly PhaseSchedule[],
  position: ProgramPosition,
): PositionLabel | null {
  if (!position.phase) return null;
  const playable = [...phases]
    .sort((a, b) => a.position - b.position)
    .filter(p => workoutsIn(p) > 0);
  const index = playable.findIndex(p => p.id === position.phase?.id);
  if (index === -1) return null;
  const weeksBefore = playable.slice(0, index).reduce((sum, p) => sum + p.repeat_count, 0);
  return {
    weekNumber: weeksBefore + position.cycleIndex,
    totalWeeks: playable.reduce((sum, p) => sum + p.repeat_count, 0),
    phaseIndex: index + 1,
    phaseCount: playable.length,
  };
}
