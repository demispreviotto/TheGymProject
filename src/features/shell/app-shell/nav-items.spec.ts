import type { UserRole } from '../../../core/auth/auth.types';
import { MAX_NAV_ITEMS, isNavItemActive, navItemsForRole, type NavItem } from './nav-items';

const ROLES: UserRole[] = ['user', 'free', 'trainer', 'admin'];

const routes = (role: UserRole): string[] => navItemsForRole(role).map(i => i.route);
const activeRoutes = (role: UserRole, url: string): string[] =>
  navItemsForRole(role).filter(item => isNavItemActive(item, url)).map(i => i.route);

describe('navItemsForRole', () => {
  it('gives every role its pages in order', () => {
    expect(routes('user')).toEqual(['/dashboard', '/profile']);
    expect(routes('free')).toEqual(['/dashboard', '/my-plan', '/my-plan/friends', '/profile']);
    expect(routes('trainer')).toEqual(['/dashboard', '/trainer/exercises', '/trainer/planning', '/trainer/clients', '/profile']);
    expect(routes('admin')).toEqual(['/dashboard', '/admin', '/my-plan', '/my-plan/friends', '/profile']);
  });

  it('never has more items than the bottom tab bar can show', () => {
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
      const items = navItemsForRole(role);
      expect(new Set(items.map(i => i.route)).size).toBe(items.length);
      expect(items.every(i => i.tabKey.startsWith('tab.') && i.labelKey.length > 0)).toBe(true);
    }
  });

  it('falls back to the client navigation for a missing role', () => {
    expect(navItemsForRole(undefined)).toBe(navItemsForRole('user'));
    expect(navItemsForRole(null)).toBe(navItemsForRole('user'));
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
    expect(activeRoutes('free', '/my-plan')).toEqual(['/my-plan']);
    expect(activeRoutes('free', '/my-plan/planning/new')).toEqual(['/my-plan']);
    expect(activeRoutes('free', '/my-plan/planning/abc-123')).toEqual(['/my-plan']);
    expect(activeRoutes('free', '/my-plan/exercises/new')).toEqual(['/my-plan']);
    expect(activeRoutes('free', '/my-plan/friends')).toEqual(['/my-plan/friends']);
  });

  it('lights up exactly one item on every page of every role', () => {
    const pages: Record<UserRole, string[]> = {
      user: ['/dashboard', '/profile'],
      free: ['/dashboard', '/my-plan', '/my-plan/planning/new', '/my-plan/friends', '/profile'],
      trainer: ['/dashboard', '/trainer/exercises', '/trainer/exercises/new', '/trainer/planning/abc', '/trainer/clients', '/profile'],
      admin: ['/dashboard', '/admin', '/my-plan', '/my-plan/exercises/new', '/my-plan/friends', '/profile'],
    };
    for (const role of ROLES) {
      for (const url of pages[role]) expect(activeRoutes(role, url), `${role} on ${url}`).toHaveLength(1);
    }
  });

  it('lights up nothing on a page that is not in the navigation', () => {
    expect(activeRoutes('free', '/somewhere/else')).toEqual([]);
  });
});
