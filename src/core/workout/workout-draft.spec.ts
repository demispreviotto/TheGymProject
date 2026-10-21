import type { WorkoutRowState } from './workout-row.types';
import type { WorkoutPrescribed } from './workout.service';
import { createRow } from './workout-stats';
import {
  DRAFT_MAX_AGE_MS, applyDraft, draftKey, isDraftStale, parseDraft, toDraft,
  type WorkoutDraft,
} from './workout-draft';

const prescribed = (id: string, rounds = 4, mode: WorkoutPrescribed['tracking_mode'] = 'standard'): WorkoutPrescribed => ({
  id,
  planning_day_id: 'd1',
  exercise_id: `e-${id}`,
  exigence: 'A',
  rest_time_minutes: 2,
  tracking_mode: mode,
  rounds,
  target_reps: 8,
  suggested_first_weight: 60,
  sorting_order: 1,
  exercise: null,
});

const NOW = 1_800_000_000_000;

describe('workout draft', () => {
  describe('draftKey', () => {
    it('is unique per user, plan and day', () => {
      expect(draftKey('u1', 'p1', 2)).not.toBe(draftKey('u2', 'p1', 2));
      expect(draftKey('u1', 'p1', 2)).not.toBe(draftKey('u1', 'p2', 2));
      expect(draftKey('u1', 'p1', 2)).not.toBe(draftKey('u1', 'p1', 3));
    });
  });

  describe('toDraft', () => {
    it('captures the inputs, rounds done and start time of every exercise', () => {
      const row = createRow(prescribed('a'), 60);
      const progressed: WorkoutRowState = { ...row, roundsDone: [true, true, false, false], inputs: [{ weight: 65, reps: 7 }] };
      const draft = toDraft([progressed], NOW - 5000, NOW);
      expect(draft).toEqual({
        version: 1,
        savedAt: NOW,
        startedAt: NOW - 5000,
        rows: [{ prescribedId: 'a', inputs: [{ weight: 65, reps: 7 }], roundsDone: [true, true, false, false] }],
      });
    });

    it('copies the arrays so later edits do not leak into the snapshot', () => {
      const row = createRow(prescribed('a'), 60);
      const draft = toDraft([row], null, NOW);
      row.roundsDone[0] = true;
      row.inputs[0].weight = 999;
      expect(draft.rows[0].roundsDone[0]).toBe(false);
      expect(draft.rows[0].inputs[0].weight).toBe(60);
    });
  });

  describe('isDraftStale', () => {
    const draft = (savedAt: number): WorkoutDraft => ({ version: 1, savedAt, startedAt: null, rows: [] });

    it('keeps a recent draft and drops one older than the maximum age', () => {
      expect(isDraftStale(draft(NOW - 60_000), NOW)).toBe(false);
      expect(isDraftStale(draft(NOW - DRAFT_MAX_AGE_MS + 1000), NOW)).toBe(false);
      expect(isDraftStale(draft(NOW - DRAFT_MAX_AGE_MS - 1000), NOW)).toBe(true);
    });

    it('drops a draft dated far in the future, tolerating small clock skew', () => {
      expect(isDraftStale(draft(NOW + 60_000), NOW)).toBe(false);
      expect(isDraftStale(draft(NOW + 60 * 60 * 1000), NOW)).toBe(true);
    });
  });

  describe('applyDraft', () => {
    it('returns the rows unchanged when there is no draft', () => {
      const rows = [createRow(prescribed('a'), 60)];
      expect(applyDraft(rows, null)).toEqual(rows);
    });

    it('restores the inputs and the rounds done of a matching exercise', () => {
      const fresh = [createRow(prescribed('a'), 60), createRow(prescribed('b'), 40)];
      const saved = toDraft(
        [{ ...fresh[0], roundsDone: [true, true, true, false], inputs: [{ weight: 62.5, reps: 8 }] }, fresh[1]],
        NOW, NOW,
      );
      const restored = applyDraft(fresh, saved);
      expect(restored[0].roundsDone).toEqual([true, true, true, false]);
      expect(restored[0].inputs).toEqual([{ weight: 62.5, reps: 8 }]);
      expect(restored[1].roundsDone).toEqual([false, false, false, false]);
    });

    it('keeps the loaded plan data and only overlays the user state', () => {
      const fresh = createRow(prescribed('a'), 60);
      const restored = applyDraft([fresh], toDraft([{ ...fresh, roundsDone: [true, false, false, false] }], NOW, NOW));
      expect(restored[0].prescribed).toBe(fresh.prescribed);
      expect(restored[0].suggestedWeight).toBe(60);
    });

    it('ignores an exercise the plan no longer has', () => {
      const fresh = [createRow(prescribed('a'), 60)];
      const draft: WorkoutDraft = {
        version: 1, savedAt: NOW, startedAt: null,
        rows: [{ prescribedId: 'gone', inputs: [{ weight: 1, reps: 1 }], roundsDone: [true, true, true, true] }],
      };
      expect(applyDraft(fresh, draft)).toEqual(fresh);
    });

    it('ignores a draft whose rounds or inputs no longer fit an edited plan', () => {
      const fresh = createRow(prescribed('a', 3), 60); // the trainer cut it from 4 to 3 rounds
      const draft: WorkoutDraft = {
        version: 1, savedAt: NOW, startedAt: null,
        rows: [{ prescribedId: 'a', inputs: [{ weight: 70, reps: 5 }], roundsDone: [true, true, true, true] }],
      };
      expect(applyDraft([fresh], draft)[0]).toBe(fresh);

      const granular = createRow(prescribed('g', 3, 'granular'), 20);
      const wrongInputs: WorkoutDraft = {
        version: 1, savedAt: NOW, startedAt: null,
        rows: [{ prescribedId: 'g', inputs: [{ weight: 1, reps: 1 }], roundsDone: [true, false, false] }],
      };
      expect(applyDraft([granular], wrongInputs)[0]).toBe(granular);
    });

    it('does not share arrays with the draft and does not mutate its input', () => {
      const fresh = [createRow(prescribed('a'), 60)];
      const draft = toDraft([{ ...fresh[0], roundsDone: [true, false, false, false] }], NOW, NOW);
      const restored = applyDraft(fresh, draft);
      restored[0].roundsDone[1] = true;
      expect(draft.rows[0].roundsDone[1]).toBe(false);
      expect(fresh[0].roundsDone).toEqual([false, false, false, false]);
    });
  });

  describe('parseDraft', () => {
    const valid = (): WorkoutDraft => toDraft([createRow(prescribed('a'), 60)], NOW, NOW);

    it('round-trips a draft through JSON', () => {
      expect(parseDraft(JSON.stringify(valid()))).toEqual(valid());
    });

    it('accepts a null weight and a null start time', () => {
      const draft = toDraft([createRow(prescribed('a'), null)], null, NOW);
      expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
    });

    it('returns null for missing, corrupt or foreign data', () => {
      expect(parseDraft(null)).toBeNull();
      expect(parseDraft('')).toBeNull();
      expect(parseDraft('{not json')).toBeNull();
      expect(parseDraft('42')).toBeNull();
      expect(parseDraft('null')).toBeNull();
      expect(parseDraft('[]')).toBeNull();
    });

    it('returns null for another version or a wrong top-level shape', () => {
      expect(parseDraft(JSON.stringify({ ...valid(), version: 2 }))).toBeNull();
      expect(parseDraft(JSON.stringify({ ...valid(), savedAt: 'yesterday' }))).toBeNull();
      expect(parseDraft(JSON.stringify({ ...valid(), startedAt: 'now' }))).toBeNull();
      expect(parseDraft(JSON.stringify({ ...valid(), rows: 'nope' }))).toBeNull();
    });

    it('returns null when any row has a wrong type', () => {
      const bad = (row: unknown): string => JSON.stringify({ ...valid(), rows: [row] });
      expect(parseDraft(bad({ prescribedId: 7, inputs: [], roundsDone: [] }))).toBeNull();
      expect(parseDraft(bad({ prescribedId: 'a', inputs: 'x', roundsDone: [] }))).toBeNull();
      expect(parseDraft(bad({ prescribedId: 'a', inputs: [], roundsDone: ['yes'] }))).toBeNull();
      expect(parseDraft(bad({ prescribedId: 'a', inputs: [{ weight: '60', reps: 8 }], roundsDone: [] }))).toBeNull();
      expect(parseDraft(bad({ prescribedId: 'a', inputs: [{ weight: 60 }], roundsDone: [] }))).toBeNull();
      expect(parseDraft(bad(null))).toBeNull();
    });
  });
});
