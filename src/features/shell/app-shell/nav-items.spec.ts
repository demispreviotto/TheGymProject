import type { UserRole } from '../../../core/auth/auth.types';
import {
  MAX_NAV_ITEMS, MIN_TABS_FOR_BAR, PROFILE_NAV_ITEM, isNavItemActive, navItemsForRole,
  showsTabBar, sidebarItemsForRole, type NavItem,
} from './nav-items';

const ROLES: UserRole[] = ['user', 'free', 'trainer', 'admin'];

const routes = (role: UserRole): string[] => navItemsForRole(role).map(i => i.route);
const sidebarRoutes = (role: UserRole): string[] => sidebarItemsForRole(role).map(i => i.route);
const activeInSidebar = (role: UserRole, url: string): string[] =>
  sidebarItemsForRole(role).filter(item => isNavItemActive(item, url)).map(i => i.route);

describe('navItemsForRole (the bottom tab bar)', () => {
  it('gives every role its pages in order, without Profile', () => {
    expect(routes('user')).toEqual(['/dashboard']);
    expect(routes('free')).toEqual(['/dashboard', '/my-plan', '/my-plan/friends']);
    expect(routes('trainer')).toEqual(['/dashboard', '/trainer', '/trainer/clients']);
    expect(routes('admin')).toEqual(['/dashboard', '/admin', '/my-plan', '/my-plan/friends']);
  });

  it('never lists Profile: it opens from the avatar', () => {
    for (const role of ROLES) expect(routes(role)).not.toContain(PROFILE_NAV_ITEM.route);
  });

  it('never has more pages than the tab bar can show', () => {
    for (const role of ROLES) expect(navItemsForRole(role).length).toBeLessThanOrEqual(MAX_NAV_ITEMS);
  });

  it('puts the workout first and exact-matched for every role', () => {
    for (const role of ROLES) {
      const [first] = navItemsForRole(role);
      expect(first.route).toBe('/dashboard');
      expect(first.exact).toBe(true);
    }
  });

  it('only exposes routes the role can open', () => {
    const forbidden = (role: UserRole, prefixes: string[]): boolean =>
      routes(role).some(r => prefixes.some(p => r.startsWith(p)));
    expect(forbidden('user', ['/trainer', '/admin', '/my-plan'])).toBe(false);
    expect(forbidden('free', ['/trainer', '/admin'])).toBe(false);
    expect(forbidden('trainer', ['/admin', '/my-plan'])).toBe(false);
  });

  it('has unique routes and a short label for every item', () => {
    for (const role of ROLES) {
      const items = sidebarItemsForRole(role);
      expect(new Set(items.map(i => i.route)).size).toBe(items.length);
      expect(items.every(i => i.tabKey.startsWith('tab.') && i.labelKey.length > 0)).toBe(true);
    }
  });

  it('falls back to the client navigation for a missing role', () => {
    expect(navItemsForRole(undefined)).toBe(navItemsForRole('user'));
    expect(navItemsForRole(null)).toBe(navItemsForRole('user'));
  });
});

describe('sidebarItemsForRole (desktop)', () => {
  it('is the role pages followed by Profile', () => {
    for (const role of ROLES) {
      expect(sidebarRoutes(role)).toEqual([...routes(role), '/profile']);
    }
  });
});

describe('showsTabBar', () => {
  it('hides the bar for a client, whose only page is the workout', () => {
    expect(showsTabBar(navItemsForRole('user'))).toBe(false);
  });

  it('shows it for every role with at least two pages', () => {
    for (const role of ['free', 'trainer', 'admin'] as const) {
      expect(navItemsForRole(role).length).toBeGreaterThanOrEqual(MIN_TABS_FOR_BAR);
      expect(showsTabBar(navItemsForRole(role))).toBe(true);
    }
  });
});

describe('isNavItemActive', () => {
  const plain: NavItem = { route: '/profile', icon: 'user', labelKey: 'a', tabKey: 'tab.a' };
  const exact: NavItem = { ...plain, route: '/dashboard', exact: true };

  it('matches the route and its nested pages', () => {
    expect(isNavItemActive(plain, '/profile')).toBe(true);
    expect(isNavItemActive(plain, '/profile/security')).toBe(true);
  });

  it('does not mistake a longer path for a prefix match', () => {
    expect(isNavItemActive(plain, '/profile-settings')).toBe(false);
  });

  it('matches an exact item only on the route itself', () => {
    expect(isNavItemActive(exact, '/dashboard')).toBe(true);
    expect(isNavItemActive(exact, '/dashboard/history')).toBe(false);
  });

  it('ignores the query string and fragment', () => {
    expect(isNavItemActive(plain, '/profile?tab=push#top')).toBe(true);
    expect(isNavItemActive(exact, '/dashboard?x=1')).toBe(true);
  });

  it('lights up the library for its own forms but not for the friends page', () => {
    expect(activeInSidebar('free', '/my-plan')).toEqual(['/my-plan']);
    expect(activeInSidebar('free', '/my-plan/planning/new')).toEqual(['/my-plan']);
    expect(activeInSidebar('free', '/my-plan/planning/abc-123')).toEqual(['/my-plan']);
    expect(activeInSidebar('free', '/my-plan/exercises/new')).toEqual(['/my-plan']);
    expect(activeInSidebar('free', '/my-plan/friends')).toEqual(['/my-plan/friends']);
  });

  it('lights up the trainer library for its pages and forms, but not for the clients page', () => {
    expect(activeInSidebar('trainer', '/trainer')).toEqual(['/trainer']);
    expect(activeInSidebar('trainer', '/trainer/exercises/new')).toEqual(['/trainer']);
    expect(activeInSidebar('trainer', '/trainer/planning/new')).toEqual(['/trainer']);
    expect(activeInSidebar('trainer', '/trainer/planning/abc-123')).toEqual(['/trainer']);
    expect(activeInSidebar('trainer', '/trainer/clients')).toEqual(['/trainer/clients']);
  });

  it('the profile item is active on /profile', () => {
    expect(isNavItemActive(PROFILE_NAV_ITEM, '/profile')).toBe(true);
    expect(isNavItemActive(PROFILE_NAV_ITEM, '/dashboard')).toBe(false);
  });

  it('lights up exactly one sidebar item on every page of every role', () => {
    const pages: Record<UserRole, string[]> = {
      user: ['/dashboard', '/profile'],
      free: ['/dashboard', '/my-plan', '/my-plan/planning/new', '/my-plan/friends', '/profile'],
      trainer: ['/dashboard', '/trainer/exercises', '/trainer/exercises/new', '/trainer/planning/abc', '/trainer/clients', '/profile'],
      admin: ['/dashboard', '/admin', '/my-plan', '/my-plan/exercises/new', '/my-plan/friends', '/profile'],
    };
    for (const role of ROLES) {
      for (const url of pages[role]) expect(activeInSidebar(role, url), `${role} on ${url}`).toHaveLength(1);
    }
  });

  it('lights up nothing on a page that is not in the navigation', () => {
    expect(activeInSidebar('free', '/somewhere/else')).toEqual([]);
  });
});
