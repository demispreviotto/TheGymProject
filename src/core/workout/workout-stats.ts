import type { WorkoutRowState } from './workout-row.types';

export interface DayPosition {
  position: number;
  total: number;
}

export function completedCount(rows: readonly WorkoutRowState[]): number {
  return rows.filter(r => r.isCompleted).length;
}

export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/**
 * Volume (weight × reps, summed over rounds) of one exercise, using the same
 * fallbacks as the saved log: empty weight counts as 0, empty reps as the target.
 */
export function rowVolume(row: WorkoutRowState): number {
  const { tracking_mode, rounds, target_reps } = row.prescribed;
  const volumeOf = (weight: number | null, reps: number | null): number =>
    (weight ?? 0) * (reps ?? target_reps);

  const total = tracking_mode === 'standard'
    ? volumeOf(row.inputs[0]?.weight ?? null, row.inputs[0]?.reps ?? null) * rounds
    : row.inputs.reduce((sum, inp) => sum + volumeOf(inp.weight, inp.reps), 0);

  return Math.round(total * 100) / 100;
}

/** Total volume of the exercises already marked as completed. */
export function sessionVolume(rows: readonly WorkoutRowState[]): number {
  const total = rows.filter(r => r.isCompleted).reduce((sum, r) => sum + rowVolume(r), 0);
  return Math.round(total * 100) / 100;
}

/**
 * Position of the active day among the plan's days ("Day 2 of 4"). Uses the
 * index in the sorted day list, not the day number, so plans with gaps
 * (days 1, 3, 5) still read "Day 2 of 3" for day 3.
 */
export function dayPosition(availableDays: readonly number[], activeDay: number): DayPosition {
  const sorted = [...new Set(availableDays)].sort((a, b) => a - b);
  const index = sorted.indexOf(activeDay);
  return { position: index === -1 ? 1 : index + 1, total: Math.max(sorted.length, 1) };
}

/** Heaviest weight entered for an exercise, or null when nothing was entered. */
export function topWeight(row: WorkoutRowState): number | null {
  const weights = row.inputs.map(i => i.weight).filter((w): w is number => w !== null);
  return weights.length > 0 ? Math.max(...weights) : null;
}

export type SuggestionSource = 'auto' | 'plan';

/**
 * Where a suggested weight came from. With auto-1RM on, a suggestion that differs from the
 * trainer's first weight was computed from the last session; otherwise it is the plan's value.
 */
export function suggestionSource(row: WorkoutRowState, usesAutoRm: boolean): SuggestionSource {
  return usesAutoRm && row.suggestedWeight !== row.prescribed.suggested_first_weight ? 'auto' : 'plan';
}

/** Id of the first exercise not yet completed: the "current" one. Null when all are done. */
export function firstIncompleteId(rows: readonly WorkoutRowState[]): string | null {
  return rows.find(r => !r.isCompleted)?.prescribed.id ?? null;
}
