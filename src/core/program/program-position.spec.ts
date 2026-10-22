import { describePosition, resolvePosition, totalWorkouts } from './program-position';
import type { PhaseSchedule } from './program.types';

const phase = (position: number, repeat: number, days: number[]): PhaseSchedule => ({
  id: `ph${position}`,
  planning_id: `pl${position}`,
  position,
  repeat_count: repeat,
  days,
});

// 4 weeks of 3 days, then a 1-week deload of 2 days: 14 workouts.
const program = [phase(1, 4, [1, 3, 5]), phase(2, 1, [1, 2])];

describe('totalWorkouts', () => {
  it('sums repeats times days across phases', () => {
    expect(totalWorkouts(program)).toBe(14);
  });

  it('ignores phases whose plan has no days', () => {
    expect(totalWorkouts([phase(1, 3, []), phase(2, 2, [1])])).toBe(2);
  });
});

describe('resolvePosition', () => {
  it('starts on the first day of the first phase', () => {
    const pos = resolvePosition(program, 0);
    expect(pos).toMatchObject({ cycleIndex: 1, dayNumber: 1, dayPosition: 1, isFinished: false });
    expect(pos.phase?.id).toBe('ph1');
  });

  it('walks the days of a week in order', () => {
    expect(resolvePosition(program, 1).dayNumber).toBe(3);
    expect(resolvePosition(program, 2).dayNumber).toBe(5);
  });

  it('repeats the plan: the next week starts again at the first day', () => {
    expect(resolvePosition(program, 3)).toMatchObject({ cycleIndex: 2, dayNumber: 1, dayPosition: 1 });
    expect(resolvePosition(program, 11)).toMatchObject({ cycleIndex: 4, dayNumber: 5 });
  });

  it('moves to the next phase after the last repeat', () => {
    const pos = resolvePosition(program, 12);
    expect(pos.phase?.id).toBe('ph2');
    expect(pos).toMatchObject({ cycleIndex: 1, dayNumber: 1 });
    expect(resolvePosition(program, 13)).toMatchObject({ dayNumber: 2, dayPosition: 2 });
  });

  it('reports a finished program once every workout is done', () => {
    expect(resolvePosition(program, 14)).toMatchObject({
      phase: null, dayNumber: null, isFinished: true, completedWorkouts: 14, totalWorkouts: 14,
    });
  });

  it('clamps the completed count when more sessions exist than workouts', () => {
    expect(resolvePosition(program, 40).completedWorkouts).toBe(14);
  });

  it('skips phases without days', () => {
    const pos = resolvePosition([phase(1, 2, []), phase(2, 1, [2, 4])], 0);
    expect(pos.phase?.id).toBe('ph2');
    expect(pos.dayNumber).toBe(2);
  });

  it('orders phases by position regardless of input order', () => {
    expect(resolvePosition([program[1], program[0]], 0).phase?.id).toBe('ph1');
  });

  it('treats negative or fractional counts as whole, non-negative', () => {
    expect(resolvePosition(program, -3).completedWorkouts).toBe(0);
    expect(resolvePosition(program, 1.9).dayNumber).toBe(3);
  });

  it('is finished with zero workouts for an empty program', () => {
    expect(resolvePosition([], 0)).toMatchObject({ isFinished: true, totalWorkouts: 0 });
  });

  it('does not mutate its input', () => {
    const input = [program[1], program[0]];
    resolvePosition(input, 5);
    expect(input[0].id).toBe('ph2');
  });
});

describe('describePosition', () => {
  it('counts weeks across phases', () => {
    // workout 12 is the first of the deload phase: week 5 of 5, phase 2 of 2
    expect(describePosition(program, resolvePosition(program, 12))).toEqual({
      weekNumber: 5, totalWeeks: 5, phaseIndex: 2, phaseCount: 2,
    });
  });

  it('starts at week 1 of the first phase', () => {
    expect(describePosition(program, resolvePosition(program, 0))).toEqual({
      weekNumber: 1, totalWeeks: 5, phaseIndex: 1, phaseCount: 2,
    });
  });

  it('moves to the next week after finishing a week of workouts', () => {
    expect(describePosition(program, resolvePosition(program, 3))?.weekNumber).toBe(2);
  });

  it('ignores phases without days in the numbering', () => {
    const phases = [phase(1, 2, []), phase(2, 3, [1])];
    expect(describePosition(phases, resolvePosition(phases, 0))).toEqual({
      weekNumber: 1, totalWeeks: 3, phaseIndex: 1, phaseCount: 1,
    });
  });

  it('is null once the program is finished', () => {
    expect(describePosition(program, resolvePosition(program, 14))).toBeNull();
  });
});
