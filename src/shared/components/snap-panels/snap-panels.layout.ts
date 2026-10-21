export type PanelSlot = 'first' | 'second';

/** Both panels at half height, or one panel at full height with the other tucked away. */
export type PanelLayout = 'split' | PanelSlot;

export const DEFAULT_PANEL_LAYOUT: PanelLayout = 'split';

const GRID_CLASS: Record<PanelLayout, string> = {
  split: 'grid-rows-[1fr_1fr] gap-3',
  first: 'grid-rows-[1fr_0fr]',
  second: 'grid-rows-[0fr_1fr]',
};

/** Tailwind classes for the grid that holds the two panels (kept as full literals so Tailwind sees them). */
export function panelGridClass(layout: PanelLayout): string {
  return GRID_CLASS[layout];
}

/** A panel is hidden when the other one has taken the full height. */
export function isPanelHidden(layout: PanelLayout, slot: PanelSlot): boolean {
  return layout !== 'split' && layout !== slot;
}
