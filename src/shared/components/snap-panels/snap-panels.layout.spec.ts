import { DEFAULT_PANEL_LAYOUT, effectiveLayout, isPanelHidden, panelGridClass } from './snap-panels.layout';

describe('snap-panels layout', () => {
  describe('effectiveLayout', () => {
    it('leaves the layout alone when the split view is allowed', () => {
      expect(effectiveLayout('split', true)).toBe('split');
      expect(effectiveLayout('first', true)).toBe('first');
      expect(effectiveLayout('second', true)).toBe('second');
    });

    it('falls back to the first panel when the split view is not allowed', () => {
      expect(effectiveLayout('split', false)).toBe('first');
    });

    it('keeps an explicit single-panel choice when the split view is not allowed', () => {
      expect(effectiveLayout('first', false)).toBe('first');
      expect(effectiveLayout('second', false)).toBe('second');
    });

    it('always shows exactly one panel when the split view is not allowed', () => {
      for (const layout of ['split', 'first', 'second'] as const) {
        const shown = effectiveLayout(layout, false);
        const hidden = (['first', 'second'] as const).filter(slot => isPanelHidden(shown, slot));
        expect(hidden).toHaveLength(1);
      }
    });
  });

  it('shows both panels at half height by default', () => {
    expect(DEFAULT_PANEL_LAYOUT).toBe('split');
    expect(panelGridClass('split')).toContain('grid-rows-[1fr_1fr]');
  });

  it('gives the whole height to one panel and none to the other', () => {
    expect(panelGridClass('first')).toContain('grid-rows-[1fr_0fr]');
    expect(panelGridClass('second')).toContain('grid-rows-[0fr_1fr]');
  });

  it('only leaves a gap between the panels while both are visible', () => {
    expect(panelGridClass('split')).toContain('gap-3');
    expect(panelGridClass('first')).not.toContain('gap');
    expect(panelGridClass('second')).not.toContain('gap');
  });

  it('hides nothing while split', () => {
    expect(isPanelHidden('split', 'first')).toBe(false);
    expect(isPanelHidden('split', 'second')).toBe(false);
  });

  it('hides the panel that is not the full one', () => {
    expect(isPanelHidden('first', 'first')).toBe(false);
    expect(isPanelHidden('first', 'second')).toBe(true);
    expect(isPanelHidden('second', 'second')).toBe(false);
    expect(isPanelHidden('second', 'first')).toBe(true);
  });
});
