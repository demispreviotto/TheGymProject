import type { UserRole } from '../../../core/auth/auth.types';
import { isMoreActive, navItemsForRole } from './nav-items';

const ROLES: UserRole[] = ['user', 'free', 'trainer', 'admin'];

const routes = (role: UserRole): string[] => navItemsForRole(role).map(i => i.route);
const tabRoutes = (role: UserRole): string[] => navItemsForRole(role).filter(i => i.inTabBar).map(i => i.route);

describe('navItemsForRole', () => {
  it('keeps the sidebar order of every role', () => {
    expect(routes('user')).toEqual(['/dashboard', '/profile']);
    expect(routes('free')).toEqual(['/dashboard', '/my-plan/planning', '/my-plan/exercises', '/my-plan/friends', '/profile']);
    expect(routes('trainer')).toEqual(['/dashboard', '/trainer/exercises', '/trainer/planning', '/trainer/clients', '/profile']);
    expect(routes('admin')).toEqual([
      '/dashboard', '/admin/requests', '/admin/users',
      '/my-plan/planning', '/my-plan/exercises', '/my-plan/friends', '/profile',
    ]);
  });

  it('puts the workout first and exact-matched for every role', () => {
    for (const role of ROLES) {
      const [first] = navItemsForRole(role);
      expect(first.route).toBe('/dashboard');
      expect(first.exact).toBe(true);
    }
  });

  it('never has more than 4 bottom tabs, leaving room for "More"', () => {
    for (const role of ROLES) {
      expect(tabRoutes(role).length).toBeLessThanOrEqual(4);
      expect(tabRoutes(role)[0]).toBe('/dashboard');
    }
  });

  it('chooses the bottom tabs per role', () => {
    expect(tabRoutes('user')).toEqual(['/dashboard', '/profile']);
    expect(tabRoutes('free')).toEqual(['/dashboard', '/my-plan/planning', '/my-plan/exercises', '/my-plan/friends']);
    expect(tabRoutes('trainer')).toEqual(['/dashboard', '/trainer/exercises', '/trainer/planning', '/trainer/clients']);
    expect(tabRoutes('admin')).toEqual(['/dashboard', '/admin/requests', '/admin/users', '/my-plan/planning']);
  });

  it('only exposes routes the role can open (no trainer or admin routes for others)', () => {
    expect(routes('user').some(r => r.startsWith('/trainer') || r.startsWith('/admin') || r.startsWith('/my-plan'))).toBe(false);
    expect(routes('free').some(r => r.startsWith('/trainer') || r.startsWith('/admin'))).toBe(false);
    expect(routes('trainer').some(r => r.startsWith('/admin') || r.startsWith('/my-plan'))).toBe(false);
  });

  it('has unique routes and a short label for every item', () => {
    for (const role of ROLES) {
      const items = navItemsForRole(role);
      expect(new Set(items.map(i => i.route)).size).toBe(items.length);
      expect(items.every(i => i.tabKey.startsWith('tab.') && i.labelKey.length > 0)).toBe(true);
    }
  });

  describe('isMoreActive', () => {
    const admin = navItemsForRole('admin');
    const free = navItemsForRole('free');

    it('is true on pages that only live behind "More"', () => {
      expect(isMoreActive(admin, '/my-plan/friends')).toBe(true);
      expect(isMoreActive(admin, '/my-plan/exercises/new')).toBe(true);
      expect(isMoreActive(free, '/profile')).toBe(true);
    });

    it('is false on a bottom tab, including its nested pages', () => {
      expect(isMoreActive(admin, '/admin/requests')).toBe(false);
      expect(isMoreActive(admin, '/my-plan/planning/new')).toBe(false);
      expect(isMoreActive(free, '/dashboard')).toBe(false);
    });

    it('ignores the query string and fragment', () => {
      expect(isMoreActive(free, '/profile?tab=push#top')).toBe(true);
      expect(isMoreActive(free, '/dashboard?x=1')).toBe(false);
    });

    it('does not mistake a longer path for a prefix match', () => {
      expect(isMoreActive(free, '/profile-settings')).toBe(false);
    });

    it('is false for roles whose pages are all tabs, and for unknown pages', () => {
      expect(isMoreActive(navItemsForRole('user'), '/profile')).toBe(false);
      expect(isMoreActive(admin, '/somewhere/else')).toBe(false);
    });
  });

  it('falls back to the client navigation for a missing role', () => {
    expect(navItemsForRole(undefined)).toBe(navItemsForRole('user'));
    expect(navItemsForRole(null)).toBe(navItemsForRole('user'));
  });
});
