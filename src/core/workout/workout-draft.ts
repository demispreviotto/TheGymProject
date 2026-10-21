import type { RoundInput, WorkoutRowState } from './workout-row.types';

/**
 * A snapshot of the workout in progress, so it survives leaving the page, a reload or closing the app.
 * It only holds what the user changed (inputs, rounds done, when they started); the plan itself is
 * always reloaded from the database and the draft is laid over it.
 */
export interface WorkoutDraftRow {
  prescribedId: string;
  inputs: RoundInput[];
  roundsDone: boolean[];
}

export interface WorkoutDraft {
  version: 1;
  savedAt: number;
  /** Wall-clock start of the session (ms), or null if the clock never started. */
  startedAt: number | null;
  rows: WorkoutDraftRow[];
}

export const DRAFT_KEY_PREFIX = 'gym.workoutDraft.v1:';

/** A workout never lasts this long; an older draft belongs to a session the user walked away from. */
export const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** Tolerated clock skew before a draft dated in the future counts as invalid. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

/** One draft per user, plan and day, so another plan or another day never inherits it. */
export function draftKey(userId: string, planId: string, dayNumber: number): string {
  return `${DRAFT_KEY_PREFIX}${userId}:${planId}:${dayNumber}`;
}

export function toDraft(rows: readonly WorkoutRowState[], startedAt: number | null, now: number): WorkoutDraft {
  return {
    version: 1,
    savedAt: now,
    startedAt,
    rows: rows.map(row => ({
      prescribedId: row.prescribed.id,
      inputs: row.inputs.map(input => ({ ...input })),
      roundsDone: [...row.roundsDone],
    })),
  };
}

export function isDraftStale(draft: WorkoutDraft, now: number): boolean {
  const age = now - draft.savedAt;
  return age > DRAFT_MAX_AGE_MS || age < -FUTURE_TOLERANCE_MS;
}

/**
 * Lays a draft over freshly loaded rows. A row takes its saved inputs and rounds only when the shape
 * still matches (same exercise id, same number of inputs and rounds); otherwise it stays untouched,
 * so an edited plan can never be corrupted by an old draft. Returns new objects, never mutates.
 */
export function applyDraft(rows: readonly WorkoutRowState[], draft: WorkoutDraft | null): WorkoutRowState[] {
  if (draft === null) return [...rows];
  return rows.map(row => {
    const saved = draft.rows.find(d => d.prescribedId === row.prescribed.id);
    const fits = saved !== undefined
      && saved.inputs.length === row.inputs.length
      && saved.roundsDone.length === row.roundsDone.length;
    if (!fits) return row;
    return { ...row, inputs: saved.inputs.map(input => ({ ...input })), roundsDone: [...saved.roundsDone] };
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumberOrNull = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isFinite(value));

function parseInput(value: unknown): RoundInput | null {
  if (!isRecord(value) || !isNumberOrNull(value['weight']) || !isNumberOrNull(value['reps'])) return null;
  return { weight: value['weight'], reps: value['reps'] };
}

function parseRow(value: unknown): WorkoutDraftRow | null {
  if (!isRecord(value) || typeof value['prescribedId'] !== 'string') return null;
  const { inputs, roundsDone } = value;
  if (!Array.isArray(inputs) || !Array.isArray(roundsDone)) return null;
  if (!roundsDone.every((done): done is boolean => typeof done === 'boolean')) return null;

  const parsedInputs = inputs.map(parseInput);
  if (parsedInputs.some(input => input === null)) return null;
  return { prescribedId: value['prescribedId'], inputs: parsedInputs as RoundInput[], roundsDone };
}

/**
 * Reads a draft from untrusted storage. Anything that is not exactly the expected shape (corrupt
 * JSON, another version, a wrong type) yields null, so a bad entry can never break the dashboard.
 */
export function parseDraft(raw: string | null): WorkoutDraft | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(value) || value['version'] !== 1 || typeof value['savedAt'] !== 'number') return null;
  if (!Number.isFinite(value['savedAt']) || !isNumberOrNull(value['startedAt']) || !Array.isArray(value['rows'])) return null;

  const rows = value['rows'].map(parseRow);
  if (rows.some(row => row === null)) return null;
  return { version: 1, savedAt: value['savedAt'], startedAt: value['startedAt'], rows: rows as WorkoutDraftRow[] };
}
