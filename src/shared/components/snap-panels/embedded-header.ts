const PAGE_HEADER = 'flex items-center justify-between mb-6';

/**
 * Inside a SnapPanels panel the header sticks to the top of the scrolling area, so its action
 * button (+ New, + Invite) never scrolls out of reach. The negative margins cancel the panel's
 * padding so the sticky bar spans the full panel width, and the negative `top` makes it stick flush
 * with the panel's edge instead of one padding-width below it (which would let rows show above it).
 */
const EMBEDDED_HEADER =
  'sticky -top-3 z-10 -mx-3 -mt-3 mb-3 flex items-center justify-between gap-3 bg-neutral-950 px-3 py-3 '
  + 'lg:-top-4 lg:-mx-4 lg:-mt-4 lg:px-4 lg:py-4';

/** Header classes for a page component that can also be shown embedded in a panel. */
export function headerClass(embedded: boolean, pageClass: string = PAGE_HEADER): string {
  return embedded ? EMBEDDED_HEADER : pageClass;
}
