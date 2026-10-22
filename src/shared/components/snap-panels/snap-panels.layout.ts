export type PanelSlot = 'first' | 'second' | 'third';

/** Panels at an even split, or one panel at full height with the others tucked away. */
export type PanelLayout = 'split' | PanelSlot;

export const DEFAULT_PANEL_LAYOUT: PanelLayout = 'split';

const GRID_CLASS_TWO: Record<PanelLayout, string> = {
  split: 'grid-rows-[1fr_1fr] gap-3',
  first: 'grid-rows-[1fr_0fr]',
  second: 'grid-rows-[0fr_1fr]',
  third: 'grid-rows-[1fr_0fr]',
};

const GRID_CLASS_THREE: Record<PanelLayout, string> = {
  split: 'grid-rows-[1fr_1fr_1fr] gap-3',
  first: 'grid-rows-[1fr_0fr_0fr]',
  second: 'grid-rows-[0fr_1fr_0fr]',
  third: 'grid-rows-[0fr_0fr_1fr]',
};

/** Tailwind classes for the grid that holds the panels (kept as full literals so Tailwind sees them). */
export function panelGridClass(layout: PanelLayout, panelCount: 2 | 3 = 2): string {
  return (panelCount === 3 ? GRID_CLASS_THREE : GRID_CLASS_TWO)[layout];
}

/**
 * The layout actually shown. When a page does not offer the half-and-half view, `split` falls back to
 * the first panel, so there is always exactly one panel on screen.
 */
export function effectiveLayout(layout: PanelLayout, allowSplit: boolean): PanelLayout {
  return !allowSplit && layout === 'split' ? 'first' : layout;
}

/** A panel is hidden when another one has taken the full height. */
export function isPanelHidden(layout: PanelLayout, slot: PanelSlot): boolean {
  return layout !== 'split' && layout !== slot;
}

const VIEW_SLOT = new Map<string, PanelSlot>([['programs', 'first'], ['plans', 'second'], ['exercises', 'third']]);

/**
 * Library pages (programs · plans · exercises) open on the panel named by `?view=`, so a form can
 * send the user back to where they came from. Plans are the default.
 */
export function layoutFromView(view: string | null): PanelSlot {
  return (view !== null ? VIEW_SLOT.get(view) : undefined) ?? 'second';
}
