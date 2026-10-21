import type { Mock, Mocked } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LanguageService } from '../i18n/language.service';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { ThemeService } from '../theme/theme.service';
import { createQueryMock, QueryMock } from '../../testing/supabase-mock';
import { AuthService } from './auth.service';
import type { Profile, Tenant } from './auth.types';

type AuthListener = (event: string, session: { user: { id: string } } | null) => void;

const profileRow = (role: Profile['role']) => ({ id: 'u1', role, name: 'Ana' });
const asProfile = (row: unknown) => row as Profile;
const tenantRow = { id: 't1', primary_hex: '#112233' } as Tenant;

describe('AuthService', () => {
  let service: AuthService;
  let router: { url: string; navigate: Mock; currentNavigation: Mock; serializeUrl: Mock };
  let theme: Mocked<ThemeService>;
  let lang: Mocked<LanguageService>;
  let profiles: QueryMock;
  let listener: AuthListener;
  let auth: Record<string, Mock>;

  // `pendingUrl` simulates a navigation still held back by the auth guards.
  const setup = (row: unknown, url = '/login', pendingUrl: string | null = null) => {
    profiles = createQueryMock({ data: row });
    router = {
      url,
      navigate: vi.fn(),
      currentNavigation: vi.fn(() => (pendingUrl === null ? null : { extractedUrl: pendingUrl })),
      serializeUrl: vi.fn((tree: string) => tree),
    };
    theme = { applyFromTenant: vi.fn() } as unknown as Mocked<ThemeService>;
    lang = { initFromProfile: vi.fn(), t: vi.fn((key: string) => `t:${key}`) } as unknown as Mocked<LanguageService>;
    auth = {
      onAuthStateChange: vi.fn((cb: AuthListener) => { listener = cb; }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({}),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: SUPABASE_CLIENT, useValue: { auth, from: () => profiles } },
        { provide: Router, useValue: router },
        { provide: ThemeService, useValue: theme },
        { provide: LanguageService, useValue: lang },
      ],
    });
    service = TestBed.inject(AuthService);
  };

  describe('loadProfile (via refreshProfile)', () => {
    it('splits tenant from profile, applies theme/language and stops loading', async () => {
      setup({ ...profileRow('user'), tenant: tenantRow });
      await service.refreshProfile();

      expect(service.profile()).toEqual(asProfile(profileRow('user')));
      expect(service.tenant()).toEqual(tenantRow);
      expect(theme.applyFromTenant).toHaveBeenCalledWith(tenantRow);
      expect(lang.initFromProfile).toHaveBeenCalled();
      expect(service.isLoading()).toBe(false);
    });

    it('treats a missing tenant as null', async () => {
      setup({ ...profileRow('free'), tenant: null });
      await service.refreshProfile();
      expect(service.tenant()).toBeNull();
      expect(theme.applyFromTenant).toHaveBeenCalledWith(null);
    });

    it('stops loading and leaves profile null when the query returns nothing', async () => {
      setup(null);
      await service.refreshProfile();
      expect(service.profile()).toBeNull();
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('redirectByRole', () => {
    const cases: [Profile['role'], string][] = [
      ['admin', '/admin'], ['trainer', '/trainer'], ['user', '/dashboard'], ['free', '/dashboard'],
    ];

    for (const [role, target] of cases) {
      it(`sends ${role} from /login to ${target}`, async () => {
        setup({ ...profileRow(role), tenant: null }, '/login');
        await service.refreshProfile();
        expect(router.navigate).toHaveBeenCalledExactlyOnceWith([target]);
      });
    }

    it('also redirects from the root url', async () => {
      setup({ ...profileRow('trainer'), tenant: null }, '/');
      await service.refreshProfile();
      expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/trainer']);
    });

    it('does not redirect when already on another page', async () => {
      setup({ ...profileRow('admin'), tenant: null }, '/profile');
      await service.refreshProfile();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('ignores the query string when checking for /login', async () => {
      setup({ ...profileRow('admin'), tenant: null }, '/login?x=1');
      await service.refreshProfile();
      expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/admin']);
    });

    describe('session restore with a pending navigation', () => {
      it('keeps the deep link instead of redirecting to the role home', async () => {
        // Hard reload: router.url is still '/' while the guards wait for the profile.
        setup({ ...profileRow('admin'), tenant: null }, '/', '/my-plan/friends');
        service.initialize();
        listener('SIGNED_IN', { user: { id: 'u1' } });
        await vi.waitFor(() => expect(service.isLoading()).toBe(false));
        expect(router.navigate).not.toHaveBeenCalled();
      });

      it('keeps a deep link for every role', async () => {
        for (const role of ['admin', 'trainer', 'user', 'free'] as const) {
          TestBed.resetTestingModule();
          setup({ ...profileRow(role), tenant: null }, '/', '/my-plan/planning?tab=1');
          await service.refreshProfile();
          expect(router.navigate).not.toHaveBeenCalled();
        }
      });

      it('still redirects when the pending navigation targets /login or the root', async () => {
        setup({ ...profileRow('trainer'), tenant: null }, '/', '/login');
        await service.refreshProfile();
        expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/trainer']);
      });
    });
  });

  describe('initialize', () => {
    it('routes PASSWORD_RECOVERY to /reset-password without loading a profile', () => {
      setup(null);
      service.initialize();
      listener('PASSWORD_RECOVERY', null);
      expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/reset-password']);
      expect(profiles['select']).not.toHaveBeenCalled();
    });

    it('sends invite sign-ins to /register before loading the profile', () => {
      setup(null);
      const previous = window.location.hash;
      window.location.hash = '#type=invite';
      try {
        service.initialize();
        listener('SIGNED_IN', { user: { id: 'u1' } });
      } finally {
        window.location.hash = previous;
      }
      expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/register']);
      expect(profiles['select']).not.toHaveBeenCalled();
    });

    it('clears state and stops loading when the session ends', () => {
      setup(null);
      service.profile.set(asProfile(profileRow('user')));
      service.initialize();
      listener('SIGNED_OUT', null);
      expect(service.profile()).toBeNull();
      expect(service.tenant()).toBeNull();
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('sign-in from the login page', () => {
    it('redirects by role once SIGNED_IN loads the profile', async () => {
      setup({ ...profileRow('admin'), tenant: null }, '/login');
      service.initialize();
      expect(await service.signIn('a@b.c', 'pw')).toBeNull();
      listener('SIGNED_IN', { user: { id: 'u1' } });
      await vi.waitFor(() => expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/admin']));
    });
  });

  describe('signIn / signOut / patchTenant', () => {
    it('signIn returns null on success and the message on failure', async () => {
      setup(null);
      expect(await service.signIn('a@b.c', 'pw')).toBeNull();
      auth['signInWithPassword'].mockResolvedValue({ error: { message: 'bad creds' } });
      expect(await service.signIn('a@b.c', 'pw')).toBe('bad creds');
    });

    it('signIn keeps the API message for a rejected login (4xx)', async () => {
      setup(null);
      auth['signInWithPassword'].mockResolvedValue({
        error: { name: 'AuthApiError', status: 400, message: 'Invalid login credentials' },
      });
      expect(await service.signIn('a@b.c', 'pw')).toBe('Invalid login credentials');
    });

    it('signIn returns the translated "unavailable" message for a gateway error', async () => {
      setup(null);
      auth['signInWithPassword'].mockResolvedValue({
        error: { name: 'AuthRetryableFetchError', status: 504, message: '{}' },
      });
      expect(await service.signIn('a@b.c', 'pw')).toBe('t:auth.error.unavailable');
    });

    it('signIn returns the translated "unavailable" message when the network fails', async () => {
      setup(null);
      auth['signInWithPassword'].mockResolvedValue({
        error: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' },
      });
      expect(await service.signIn('a@b.c', 'pw')).toBe('t:auth.error.unavailable');
    });

    it('signOut clears state and navigates to /login', async () => {
      setup(null);
      service.profile.set(asProfile(profileRow('user')));
      service.tenant.set(tenantRow);
      await service.signOut();
      expect(service.profile()).toBeNull();
      expect(service.tenant()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('patchTenant merges into the current tenant and ignores a null tenant', () => {
      setup(null);
      service.patchTenant({ name: 'ignored' });
      expect(service.tenant()).toBeNull();
      service.tenant.set(tenantRow);
      service.patchTenant({ name: 'Gym' });
      expect(service.tenant()).toEqual({ ...tenantRow, name: 'Gym' });
    });
  });
});
