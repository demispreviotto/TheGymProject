import type { RoundInput, WorkoutRowState } from './workout-row.types';
import type { WorkoutPrescribed } from './workout.service';

export interface DayPosition {
  position: number;
  total: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Number of rounds to track. A plan with 0 rounds still gets one, so the exercise can be completed. */
export function roundCount(prescribed: Pick<WorkoutPrescribed, 'rounds'>): number {
  return Math.max(1, prescribed.rounds);
}

/**
 * Starting inputs of an exercise: one shared pair in standard mode, one pair per round otherwise,
 * pre-filled with the suggested weight and the target reps. What the user sees on screen is then
 * exactly what gets saved if they do not touch it.
 */
export function initialInputs(
  prescribed: Pick<WorkoutPrescribed, 'tracking_mode' | 'rounds' | 'target_reps'>,
  suggestedWeight: number | null,
): RoundInput[] {
  const count = prescribed.tracking_mode === 'standard' ? 1 : roundCount(prescribed);
  return Array.from({ length: count }, () => ({ weight: suggestedWeight, reps: prescribed.target_reps }));
}

/** A fresh, untouched exercise row: pre-filled inputs and no round done. */
export function createRow(prescribed: WorkoutPrescribed, suggestedWeight: number | null): WorkoutRowState {
  return {
    prescribed,
    suggestedWeight,
    inputs: initialInputs(prescribed, suggestedWeight),
    roundsDone: Array.from({ length: roundCount(prescribed) }, () => false),
  };
}

export function isRowCompleted(row: WorkoutRowState): boolean {
  return row.roundsDone.length > 0 && row.roundsDone.every(Boolean);
}

export function completedRounds(row: WorkoutRowState): number {
  return row.roundsDone.filter(Boolean).length;
}

/** Index of the first round not yet done, or -1 when every round is done. */
export function currentRound(row: WorkoutRowState): number {
  return row.roundsDone.indexOf(false);
}

export type RoundStatus = 'done' | 'current' | 'upcoming';

/**
 * How a round is shown in granular / failure mode: finished rounds collapse to one line, only the
 * current one gets the full weight / reps entry, and the rest wait as a one-liner.
 */
export function roundStatus(row: WorkoutRowState, round: number): RoundStatus {
  if (row.roundsDone[round]) return 'done';
  return round === currentRound(row) ? 'current' : 'upcoming';
}

/** Index of the last round that is done, or -1 when none is. */
export function lastDoneRound(row: WorkoutRowState): number {
  return row.roundsDone.lastIndexOf(true);
}

/** Copy of `roundsDone` with one round set. An out-of-range index changes nothing. */
export function withRoundDone(roundsDone: readonly boolean[], index: number, done: boolean): boolean[] {
  const next = [...roundsDone];
  if (index >= 0 && index < next.length) next[index] = done;
  return next;
}

export function completedCount(rows: readonly WorkoutRowState[]): number {
  return rows.filter(isRowCompleted).length;
}

export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/**
 * Volume (weight × reps) of the rounds already done in one exercise, with the same fallbacks as
 * the saved log: empty weight counts as 0, empty reps as the target. Standard mode uses its single
 * shared pair for every round; the other modes use each round's own pair.
 */
export function completedVolume(row: WorkoutRowState): number {
  const { tracking_mode, target_reps } = row.prescribed;
  const total = row.roundsDone.reduce((sum, done, index) => {
    const input = tracking_mode === 'standard' ? row.inputs[0] : row.inputs[index];
    if (!done || !input) return sum;
    return sum + (input.weight ?? 0) * (input.reps ?? target_reps);
  }, 0);
  return round2(total);
}

/** Total volume of every round done so far in the session. */
export function sessionVolume(rows: readonly WorkoutRowState[]): number {
  return round2(rows.reduce((sum, row) => sum + completedVolume(row), 0));
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
  return rows.find(r => !isRowCompleted(r))?.prescribed.id ?? null;
}
