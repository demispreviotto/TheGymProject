import type { UserRole } from '../../../core/auth/auth.types';
import type { IconName } from '../../../shared/ui/icons/icon.types';

export interface NavItem {
  route: string;
  icon: IconName;
  /** Full label, used by the desktop sidebar and the mobile drawer. */
  labelKey: string;
  /** Short label, used under the icon in the mobile bottom tab bar. */
  tabKey: string;
  /** Match the route exactly when highlighting the active item. */
  exact?: boolean;
  /** Shown as a bottom tab on mobile; the remaining items live behind "More". */
  inTabBar: boolean;
}

type NavEntry = Omit<NavItem, 'inTabBar'>;

const WORKOUT: NavEntry = { route: '/dashboard', icon: 'barbell', labelKey: 'nav.workout', tabKey: 'tab.workout', exact: true };
const PROFILE: NavEntry = { route: '/profile', icon: 'user', labelKey: 'nav.profile', tabKey: 'tab.profile' };

const TRAINER_EXERCISES: NavEntry = { route: '/trainer/exercises', icon: 'list-numbers', labelKey: 'nav.exercises', tabKey: 'tab.exercises' };
const TRAINER_PLANS: NavEntry = { route: '/trainer/planning', icon: 'calendar', labelKey: 'nav.plans', tabKey: 'tab.plans' };
const TRAINER_CLIENTS: NavEntry = { route: '/trainer/clients', icon: 'users', labelKey: 'nav.clients', tabKey: 'tab.clients' };

const ADMIN_REQUESTS: NavEntry = { route: '/admin/requests', icon: 'envelope', labelKey: 'nav.admin.requests', tabKey: 'tab.requests' };
const ADMIN_USERS: NavEntry = { route: '/admin/users', icon: 'user-group', labelKey: 'nav.admin.users', tabKey: 'tab.users' };

const MY_PLANS: NavEntry = { route: '/my-plan/planning', icon: 'strategy', labelKey: 'nav.myplan.planning', tabKey: 'tab.plans' };
const MY_EXERCISES: NavEntry = { route: '/my-plan/exercises', icon: 'list-numbers', labelKey: 'nav.myplan.exercises', tabKey: 'tab.exercises' };
const MY_FRIENDS: NavEntry = { route: '/my-plan/friends', icon: 'users', labelKey: 'nav.myplan.friends', tabKey: 'tab.friends' };

const tab = (entry: NavEntry): NavItem => ({ ...entry, inTabBar: true });
const more = (entry: NavEntry): NavItem => ({ ...entry, inTabBar: false });

/**
 * Navigation per role, in sidebar order. At most 4 items per role are bottom tabs, so the
 * tab bar (plus its "More" button) never holds more than 5 targets.
 */
const NAV_BY_ROLE: Record<UserRole, readonly NavItem[]> = {
  user: [tab(WORKOUT), tab(PROFILE)],
  free: [tab(WORKOUT), tab(MY_PLANS), tab(MY_EXERCISES), tab(MY_FRIENDS), more(PROFILE)],
  trainer: [tab(WORKOUT), tab(TRAINER_EXERCISES), tab(TRAINER_PLANS), tab(TRAINER_CLIENTS), more(PROFILE)],
  admin: [
    tab(WORKOUT), tab(ADMIN_REQUESTS), tab(ADMIN_USERS),
    tab(MY_PLANS), more(MY_EXERCISES), more(MY_FRIENDS), more(PROFILE),
  ],
};

/**
 * True when `url` belongs to a page that only lives behind "More" (not to any bottom tab),
 * so the tab bar can highlight "More" instead of leaving every tab unlit.
 */
export function isMoreActive(items: readonly NavItem[], url: string): boolean {
  const path = url.split(/[?#]/)[0];
  const matches = (item: NavItem): boolean =>
    item.exact ? path === item.route : path === item.route || path.startsWith(`${item.route}/`);

  const onTab = items.some(item => item.inTabBar && matches(item));
  const onMore = items.some(item => !item.inTabBar && matches(item));
  return onMore && !onTab;
}

/** Navigation items for a role. An unknown or missing role gets the plain client navigation. */
export function navItemsForRole(role: UserRole | null | undefined): readonly NavItem[] {
  return NAV_BY_ROLE[role ?? 'user'];
}
