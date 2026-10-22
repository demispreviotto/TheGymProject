import type { PhaseDraft } from './program.types';

export const MAX_REPEAT_WEEKS = 52;

/** A new phase, defaulting to one week. */
export const newPhase = (planningId: string): PhaseDraft => ({ planning_id: planningId, repeat_count: 1 });

/** Keeps a typed week count a whole number between 1 and the database limit. */
export function clampWeeks(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_REPEAT_WEEKS, Math.max(1, Math.round(value)));
}

/** Swaps a phase with its neighbour (-1 up, +1 down); out-of-range moves return the list unchanged. */
export function movePhase(phases: readonly PhaseDraft[], index: number, direction: -1 | 1): PhaseDraft[] {
  const target = index + direction;
  if (index < 0 || index >= phases.length || target < 0 || target >= phases.length) return [...phases];
  const next = [...phases];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Total weeks a program lasts. */
export const totalWeeks = (phases: readonly { repeat_count: number }[]): number =>
  phases.reduce((sum, p) => sum + p.repeat_count, 0);
