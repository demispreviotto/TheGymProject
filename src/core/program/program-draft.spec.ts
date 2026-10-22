import { clampWeeks, movePhase, newPhase, totalWeeks } from './program-draft';

const phases = [newPhase('a'), newPhase('b'), newPhase('c')];

describe('movePhase', () => {
  it('moves a phase up', () => {
    expect(movePhase(phases, 1, -1).map(p => p.planning_id)).toEqual(['b', 'a', 'c']);
  });

  it('moves a phase down', () => {
    expect(movePhase(phases, 1, 1).map(p => p.planning_id)).toEqual(['a', 'c', 'b']);
  });

  it('leaves the list alone at the edges', () => {
    expect(movePhase(phases, 0, -1)).toEqual(phases);
    expect(movePhase(phases, 2, 1)).toEqual(phases);
  });

  it('does not mutate its input', () => {
    movePhase(phases, 0, 1);
    expect(phases.map(p => p.planning_id)).toEqual(['a', 'b', 'c']);
  });
});

describe('clampWeeks', () => {
  it('keeps whole numbers within 1..52', () => {
    expect(clampWeeks(4)).toBe(4);
    expect(clampWeeks(0)).toBe(1);
    expect(clampWeeks(-3)).toBe(1);
    expect(clampWeeks(99)).toBe(52);
  });

  it('rounds fractions and falls back to 1 for non-numbers', () => {
    expect(clampWeeks(2.6)).toBe(3);
    expect(clampWeeks(NaN)).toBe(1);
  });
});

describe('totalWeeks', () => {
  it('sums the repeats', () => {
    expect(totalWeeks([{ repeat_count: 4 }, { repeat_count: 1 }, { repeat_count: 3 }])).toBe(8);
  });
});
