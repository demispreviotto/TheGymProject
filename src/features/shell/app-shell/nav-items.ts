import type { UserRole } from '../../../core/auth/auth.types';
import type { IconName } from '../../../shared/ui/icons/icon.types';

export interface NavItem {
  route: string;
  icon: IconName;
  /** Full label, used by the desktop sidebar. */
  labelKey: string;
  /** Short label, used under the icon in the mobile bottom tab bar. */
  tabKey: string;
  /** Match the route exactly when highlighting the active item. */
  exact?: boolean;
  /**
   * Path prefixes that also light this item up, for pages that live under a different URL than
   * `route` (e.g. the plan forms under /my-plan/planning belong to the /my-plan library page).
   */
  activeFor?: readonly string[];
}

const WORKOUT: NavItem = { route: '/dashboard', icon: 'barbell', labelKey: 'nav.workout', tabKey: 'tab.workout', exact: true };

/**
 * Profile is not a tab: on mobile it opens from the avatar in the top bar. The desktop sidebar has
 * no avatar, so it appends this item itself (see sidebarItemsForRole).
 */
export const PROFILE_NAV_ITEM: NavItem = { route: '/profile', icon: 'user', labelKey: 'nav.profile', tabKey: 'tab.profile' };

const TRAINER_LIBRARY: NavItem = {
  route: '/trainer',
  icon: 'strategy',
  labelKey: 'nav.myplan.library',
  tabKey: 'tab.plans',
  activeFor: ['/trainer/exercises', '/trainer/planning'],
};
const TRAINER_CLIENTS: NavItem = { route: '/trainer/clients', icon: 'users', labelKey: 'nav.clients', tabKey: 'tab.clients' };

const ADMIN_PANEL: NavItem = { route: '/admin', icon: 'address-book-tabs', labelKey: 'nav.admin.panel', tabKey: 'tab.admin' };

const MY_LIBRARY: NavItem = {
  route: '/my-plan',
  icon: 'strategy',
  labelKey: 'nav.myplan.library',
  tabKey: 'tab.plans',
  activeFor: ['/my-plan/planning', '/my-plan/exercises'],
};
const MY_FRIENDS: NavItem = { route: '/my-plan/friends', icon: 'users', labelKey: 'nav.myplan.friends', tabKey: 'tab.friends' };

/** Most pages any role has: the bottom tab bar shows them all, so it must stay at this size or below. */
export const MAX_NAV_ITEMS = 5;

/** Fewest tabs worth showing a bottom bar for; a lone "Workout" tab is just clutter. */
export const MIN_TABS_FOR_BAR = 2;

const NAV_BY_ROLE: Record<UserRole, readonly NavItem[]> = {
  user: [WORKOUT],
  free: [WORKOUT, MY_LIBRARY, MY_FRIENDS],
  trainer: [WORKOUT, TRAINER_LIBRARY, TRAINER_CLIENTS],
  admin: [WORKOUT, ADMIN_PANEL, MY_LIBRARY, MY_FRIENDS],
};

/**
 * The pages of a role, in tab-bar order (Profile excluded: it lives behind the avatar). An unknown
 * or missing role gets the plain client navigation.
 */
export function navItemsForRole(role: UserRole | null | undefined): readonly NavItem[] {
  return NAV_BY_ROLE[role ?? 'user'];
}

/** The desktop sidebar: the role's pages, then Profile. */
export function sidebarItemsForRole(role: UserRole | null | undefined): readonly NavItem[] {
  return [...navItemsForRole(role), PROFILE_NAV_ITEM];
}

/** Whether the mobile bottom bar is worth showing for these pages. */
export function showsTabBar(items: readonly NavItem[]): boolean {
  return items.length >= MIN_TABS_FOR_BAR;
}

const underPath = (path: string, prefix: string): boolean => path === prefix || path.startsWith(`${prefix}/`);

/** Whether the current page belongs to a nav item. Ignores the query string and fragment. */
export function isNavItemActive(item: NavItem, url: string): boolean {
  const path = url.split(/[?#]/)[0];
  if (item.activeFor) return path === item.route || item.activeFor.some(prefix => underPath(path, prefix));
  return item.exact ? path === item.route : underPath(path, item.route);
}
