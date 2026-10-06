import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { createQueryMock, QueryMock } from '../../testing/supabase-mock';
import type { WorkoutLog, WorkoutSession } from '../planning/planning.types';
import { LogPayload, WorkoutService } from './workout.service';

const session = (day: number): WorkoutSession => ({ day_number: day } as WorkoutSession);
const log = (weight: number, reps: number): WorkoutLog =>
  ({ weight_used: weight, reps_performed: reps } as WorkoutLog);

describe('WorkoutService', () => {
  let service: WorkoutService;
  let tables: Record<string, QueryMock>;

  beforeEach(() => {
    tables = {};
    const client = { from: jasmine.createSpy('from').and.callFake((t: string) => tables[t]) };
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: client }] });
    service = TestBed.inject(WorkoutService);
  });

  describe('computeSuggestedWeight', () => {
    it('returns the fallback when there is no history', () => {
      expect(service.computeSuggestedWeight(null, 10, 40)).toBe(40);
      expect(service.computeSuggestedWeight(null, 10, null)).toBeNull();
    });

    it('applies Epley and rounds to the nearest 0.25', () => {
      // 1RM = 100 * (1 + 10/30) = 133.33; target 5 reps -> 133.33 / (1 + 5/30) = 114.28 -> 114.25
      expect(service.computeSuggestedWeight(log(100, 10), 5, null)).toBe(114.25);
    });

    it('suggests the same weight when target reps match the logged reps', () => {
      expect(service.computeSuggestedWeight(log(80, 8), 8, null)).toBe(80);
    });

    it('ignores the fallback when history exists', () => {
      expect(service.computeSuggestedWeight(log(60, 10), 10, 999)).toBe(60);
    });
  });

  describe('resolveActiveDay', () => {
    it('defaults to day 1 when the plan has no days', () => {
      expect(service.resolveActiveDay(null, [])).toBe(1);
    });

    it('starts at the first day when there is no previous session', () => {
      expect(service.resolveActiveDay(null, [3, 1, 5])).toBe(1);
    });

    it('advances to the next available day', () => {
      expect(service.resolveActiveDay(session(1), [1, 3, 5])).toBe(3);
    });

    it('wraps to the first day after the last one', () => {
      expect(service.resolveActiveDay(session(5), [5, 1, 3])).toBe(1);
    });

    it('restarts when the last session day is no longer in the plan', () => {
      expect(service.resolveActiveDay(session(2), [1, 3])).toBe(1);
    });

    it('does not mutate the input array', () => {
      const days = [3, 1];
      service.resolveActiveDay(null, days);
      expect(days).toEqual([3, 1]);
    });
  });

  describe('saveSession', () => {
    const logs: LogPayload[] = [
      { exercise_id: 'e1', round_number: 1, weight_used: 50, reps_performed: 10, is_completed: true },
      { exercise_id: 'e1', round_number: 2, weight_used: 50, reps_performed: 8, is_completed: false },
    ];

    it('inserts the session then its logs tagged with the session id', async () => {
      tables['workout_sessions'] = createQueryMock({ data: { id: 's1' }, error: null });
      tables['workout_logs'] = createQueryMock({ error: null });

      const result = await service.saveSession('u1', 'p1', 2, 4, logs);

      expect(result).toBeNull();
      expect(tables['workout_sessions']['insert']).toHaveBeenCalledWith({
        user_id: 'u1', planning_id: 'p1', day_number: 2, subjective_score: 4,
      });
      expect(tables['workout_logs']['insert']).toHaveBeenCalledWith(
        logs.map(l => ({ ...l, session_id: 's1' })),
      );
    });

    it('returns the session error and skips inserting logs', async () => {
      tables['workout_sessions'] = createQueryMock({ data: null, error: { message: 'boom' } });
      tables['workout_logs'] = createQueryMock({ error: null });

      expect(await service.saveSession('u1', 'p1', 1, 3, logs)).toBe('boom');
      expect(tables['workout_logs']['insert']).not.toHaveBeenCalled();
    });

    it('returns the logs error message', async () => {
      tables['workout_sessions'] = createQueryMock({ data: { id: 's1' }, error: null });
      tables['workout_logs'] = createQueryMock({ error: { message: 'logs failed' } });

      expect(await service.saveSession('u1', 'p1', 1, 3, logs)).toBe('logs failed');
    });
  });

  describe('loadLastLog', () => {
    it('returns null without querying logs when the user has no sessions', async () => {
      tables['workout_sessions'] = createQueryMock({ data: [] });
      tables['workout_logs'] = createQueryMock({ data: null });

      expect(await service.loadLastLog('u1', 'e1')).toBeNull();
      expect(tables['workout_logs']['select']).not.toHaveBeenCalled();
    });

    it('filters completed logs of the exercise across recent sessions', async () => {
      tables['workout_sessions'] = createQueryMock({ data: [{ id: 's1' }, { id: 's2' }] });
      tables['workout_logs'] = createQueryMock({ data: { id: 'l1' } });

      expect(await service.loadLastLog('u1', 'e1')).toEqual({ id: 'l1' } as WorkoutLog);
      expect(tables['workout_logs']['in']).toHaveBeenCalledWith('session_id', ['s1', 's2']);
      expect(tables['workout_logs']['eq']).toHaveBeenCalledWith('is_completed', true);
    });
  });
});
