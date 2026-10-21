import { nextStepValue } from './number-step';

describe('nextStepValue', () => {
  it('steps up and down from the current value', () => {
    expect(nextStepValue(70, null, 2.5, 0, 1)).toBe(72.5);
    expect(nextStepValue(70, null, 2.5, 0, -1)).toBe(67.5);
  });

  it('starts from the fallback (placeholder) when there is no value yet', () => {
    expect(nextStepValue(null, 70, 2.5, 0, 1)).toBe(72.5);
    expect(nextStepValue(null, 8, 1, 0, -1)).toBe(7);
  });

  it('starts from zero when there is neither a value nor a fallback', () => {
    expect(nextStepValue(null, null, 2.5, 0, 1)).toBe(2.5);
  });

  it('never goes below the minimum', () => {
    expect(nextStepValue(1, null, 2.5, 0, -1)).toBe(0);
    expect(nextStepValue(null, null, 1, 0, -1)).toBe(0);
  });

  it('does not accumulate floating point noise', () => {
    let value = 0.1;
    for (let i = 0; i < 10; i++) value = nextStepValue(value, null, 0.1, 0, 1);
    expect(value).toBe(1.1);
  });

  it('keeps a typed value that is not on the step grid', () => {
    expect(nextStepValue(71.25, null, 2.5, 0, 1)).toBe(73.75);
  });
});
