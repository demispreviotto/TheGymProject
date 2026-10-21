import { initials } from './initials';

describe('initials', () => {
  it('uses the first and last word of a name', () => {
    expect(initials('Test Client')).toBe('TC');
    expect(initials('  ana   maria  lopez ')).toBe('AL');
  });

  it('uses a single initial for a single word', () => {
    expect(initials('madonna')).toBe('M');
  });

  it('uppercases accented and non-latin letters', () => {
    expect(initials('émile zola')).toBe('ÉZ');
  });

  it('does not split an emoji in half', () => {
    expect(initials('😀 Smile')).toBe('😀S');
  });

  it('falls back to a question mark when there is no name', () => {
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
    expect(initials(null)).toBe('?');
    expect(initials(undefined)).toBe('?');
  });
});
