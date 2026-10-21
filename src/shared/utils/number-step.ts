/**
 * Next value of a +/- stepper. Starts from the current value, else from the fallback
 * (the placeholder the user is looking at), else 0. Never goes below `min`, and rounds to
 * 2 decimals so repeated 2.5 steps don't accumulate floating point noise.
 */
export function nextStepValue(
  current: number | null,
  fallback: number | null,
  step: number,
  min: number,
  direction: 1 | -1,
): number {
  const base = current ?? fallback ?? 0;
  const next = Math.round((base + direction * step) * 100) / 100;
  return Math.max(min, next);
}
