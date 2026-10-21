import { DEFAULT_PANEL_LAYOUT, isPanelHidden, panelGridClass } from './snap-panels.layout';

describe('snap-panels layout', () => {
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
