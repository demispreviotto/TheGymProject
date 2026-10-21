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
const PROFILE: NavItem = { route: '/profile', icon: 'user', labelKey: 'nav.profile', tabKey: 'tab.profile' };

const TRAINER_EXERCISES: NavItem = { route: '/trainer/exercises', icon: 'list-numbers', labelKey: 'nav.exercises', tabKey: 'tab.exercises' };
const TRAINER_PLANS: NavItem = { route: '/trainer/planning', icon: 'calendar', labelKey: 'nav.plans', tabKey: 'tab.plans' };
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

/** Most items any role has: the bottom tab bar shows them all, so it must stay at this size or below. */
export const MAX_NAV_ITEMS = 5;

const NAV_BY_ROLE: Record<UserRole, readonly NavItem[]> = {
  user: [WORKOUT, PROFILE],
  free: [WORKOUT, MY_LIBRARY, MY_FRIENDS, PROFILE],
  trainer: [WORKOUT, TRAINER_EXERCISES, TRAINER_PLANS, TRAINER_CLIENTS, PROFILE],
  admin: [WORKOUT, ADMIN_PANEL, MY_LIBRARY, MY_FRIENDS, PROFILE],
};

/** Navigation items for a role, in sidebar and tab-bar order. An unknown or missing role gets the plain client navigation. */
export function navItemsForRole(role: UserRole | null | undefined): readonly NavItem[] {
  return NAV_BY_ROLE[role ?? 'user'];
}

const underPath = (path: string, prefix: string): boolean => path === prefix || path.startsWith(`${prefix}/`);

/** Whether the current page belongs to a nav item. Ignores the query string and fragment. */
export function isNavItemActive(item: NavItem, url: string): boolean {
  const path = url.split(/[?#]/)[0];
  if (item.activeFor) return path === item.route || item.activeFor.some(prefix => underPath(path, prefix));
  return item.exact ? path === item.route : underPath(path, item.route);
}
