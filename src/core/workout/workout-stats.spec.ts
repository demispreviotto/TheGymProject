import type { TrackingMode } from '../planning/planning.types';
import type { RoundInput, WorkoutRowState } from './workout-row.types';
import {
  completedCount,
  dayPosition,
  firstIncompleteId,
  initialInputs,
  progressPercent,
  rowVolume,
  sessionVolume,
  suggestionSource,
  topWeight,
} from './workout-stats';

interface RowOptions {
  id?: string;
  mode?: TrackingMode;
  rounds?: number;
  targetReps?: number;
  inputs?: RoundInput[];
  done?: boolean;
}

function makeRow(opts: RowOptions = {}): WorkoutRowState {
  const mode = opts.mode ?? 'standard';
  const rounds = opts.rounds ?? 4;
  return {
    prescribed: {
      id: opts.id ?? 'p1',
      planning_day_id: 'd1',
      exercise_id: 'e1',
      exigence: 'A',
      rest_time_minutes: 2,
      tracking_mode: mode,
      rounds,
      target_reps: opts.targetReps ?? 8,
      suggested_first_weight: null,
      sorting_order: 1,
      exercise: null,
    },
    suggestedWeight: null,
    inputs: opts.inputs ?? [{ weight: null, reps: null }],
    isCompleted: opts.done ?? false,
  };
}

describe('workout-stats', () => {
  describe('initialInputs', () => {
    it('standard mode gives one shared pair, pre-filled with the suggestion and the target reps', () => {
      expect(initialInputs({ tracking_mode: 'standard', rounds: 4, target_reps: 8 }, 62.5))
        .toEqual([{ weight: 62.5, reps: 8 }]);
    });

    it('granular and failure modes give one independent pair per round', () => {
      for (const mode of ['granular', 'failure'] as const) {
        const inputs = initialInputs({ tracking_mode: mode, rounds: 3, target_reps: 10 }, 40);
        expect(inputs).toHaveLength(3);
        expect(inputs.every(i => i.weight === 40 && i.reps === 10)).toBe(true);
      }
    });

    it('leaves the weight empty when there is no suggestion', () => {
      expect(initialInputs({ tracking_mode: 'standard', rounds: 3, target_reps: 12 }, null))
        .toEqual([{ weight: null, reps: 12 }]);
    });

    it('does not share one object between rounds', () => {
      const [first, second] = initialInputs({ tracking_mode: 'granular', rounds: 2, target_reps: 5 }, 20);
      expect(first).not.toBe(second);
    });
  });

  describe('completedCount / progressPercent', () => {
    it('counts only completed rows', () => {
      const rows = [makeRow({ done: true }), makeRow({ done: false }), makeRow({ done: true })];
      expect(completedCount(rows)).toBe(2);
      expect(completedCount([])).toBe(0);
    });

    it('rounds the percentage and guards against an empty plan', () => {
      expect(progressPercent(2, 4)).toBe(50);
      expect(progressPercent(1, 3)).toBe(33);
      expect(progressPercent(0, 0)).toBe(0);
    });
  });

  describe('rowVolume', () => {
    it('standard mode multiplies the shared pair by the number of rounds', () => {
      const row = makeRow({ rounds: 4, inputs: [{ weight: 70, reps: 8 }] });
      expect(rowVolume(row)).toBe(70 * 8 * 4);
    });

    it('falls back to the target reps and a zero weight when inputs are empty', () => {
      expect(rowVolume(makeRow({ rounds: 3, targetReps: 10 }))).toBe(0);
      expect(rowVolume(makeRow({ rounds: 3, targetReps: 10, inputs: [{ weight: 20, reps: null }] }))).toBe(20 * 10 * 3);
    });

    it('granular mode sums each round independently', () => {
      const row = makeRow({
        mode: 'granular',
        rounds: 3,
        inputs: [
          { weight: 60, reps: 10 },
          { weight: 62.5, reps: 8 },
          { weight: 65, reps: 6 },
        ],
      });
      expect(rowVolume(row)).toBe(600 + 500 + 390);
    });

    it('does not accumulate floating point noise', () => {
      const row = makeRow({ rounds: 3, inputs: [{ weight: 22.5, reps: 7 }] });
      expect(rowVolume(row)).toBe(472.5);
    });
  });

  describe('sessionVolume', () => {
    it('counts completed exercises only', () => {
      const done = makeRow({ id: 'a', rounds: 2, inputs: [{ weight: 50, reps: 10 }], done: true });
      const pending = makeRow({ id: 'b', rounds: 2, inputs: [{ weight: 100, reps: 10 }], done: false });
      expect(sessionVolume([done, pending])).toBe(1000);
    });

    it('is zero for an empty session', () => {
      expect(sessionVolume([])).toBe(0);
    });
  });

  describe('dayPosition', () => {
    it('is the index in the sorted day list, not the day number', () => {
      expect(dayPosition([1, 3, 5], 3)).toEqual({ position: 2, total: 3 });
      expect(dayPosition([5, 1, 3], 5)).toEqual({ position: 3, total: 3 });
    });

    it('ignores duplicates and falls back to the first position for an unknown day', () => {
      expect(dayPosition([1, 1, 2], 2)).toEqual({ position: 2, total: 2 });
      expect(dayPosition([1, 2], 7)).toEqual({ position: 1, total: 2 });
    });

    it('never reports a total of zero', () => {
      expect(dayPosition([], 1)).toEqual({ position: 1, total: 1 });
    });
  });

  describe('topWeight', () => {
    it('is the heaviest weight entered', () => {
      const row = makeRow({
        mode: 'granular',
        inputs: [{ weight: 60, reps: 10 }, { weight: 65, reps: 8 }, { weight: null, reps: null }],
      });
      expect(topWeight(row)).toBe(65);
    });

    it('is null when nothing was entered', () => {
      expect(topWeight(makeRow())).toBeNull();
    });

    it('keeps a legitimate zero weight (bodyweight)', () => {
      expect(topWeight(makeRow({ inputs: [{ weight: 0, reps: 12 }] }))).toBe(0);
    });
  });

  describe('suggestionSource', () => {
    it('is "plan" when auto-1RM is off', () => {
      const row = { ...makeRow(), suggestedWeight: 70 };
      expect(suggestionSource(row, false)).toBe('plan');
    });

    it('is "auto" when auto-1RM is on and the weight differs from the trainer value', () => {
      const base = makeRow();
      const row: WorkoutRowState = {
        ...base,
        prescribed: { ...base.prescribed, suggested_first_weight: 60 },
        suggestedWeight: 72.5,
      };
      expect(suggestionSource(row, true)).toBe('auto');
    });

    it('is "plan" when auto-1RM is on but there was no history to compute from', () => {
      const base = makeRow();
      const row: WorkoutRowState = {
        ...base,
        prescribed: { ...base.prescribed, suggested_first_weight: 60 },
        suggestedWeight: 60,
      };
      expect(suggestionSource(row, true)).toBe('plan');
    });
  });

  describe('firstIncompleteId', () => {
    it('returns the first pending exercise in order', () => {
      const rows = [makeRow({ id: 'a', done: true }), makeRow({ id: 'b' }), makeRow({ id: 'c' })];
      expect(firstIncompleteId(rows)).toBe('b');
    });

    it('returns null when everything is done or there are no rows', () => {
      expect(firstIncompleteId([makeRow({ id: 'a', done: true })])).toBeNull();
      expect(firstIncompleteId([])).toBeNull();
    });
  });
});
