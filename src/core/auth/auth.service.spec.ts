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
  let router: { url: string; navigate: jasmine.Spy };
  let theme: jasmine.SpyObj<ThemeService>;
  let lang: jasmine.SpyObj<LanguageService>;
  let profiles: QueryMock;
  let listener: AuthListener;
  let auth: Record<string, jasmine.Spy>;

  const setup = (row: unknown, url = '/login') => {
    profiles = createQueryMock({ data: row });
    router = { url, navigate: jasmine.createSpy('navigate') };
    theme = jasmine.createSpyObj('ThemeService', ['applyFromTenant']);
    lang = jasmine.createSpyObj('LanguageService', ['initFromProfile']);
    auth = {
      onAuthStateChange: jasmine.createSpy().and.callFake((cb: AuthListener) => { listener = cb; }),
      getUser: jasmine.createSpy().and.resolveTo({ data: { user: { id: 'u1' } } }),
      signInWithPassword: jasmine.createSpy().and.resolveTo({ error: null }),
      signOut: jasmine.createSpy().and.resolveTo({}),
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
      expect(service.isLoading()).toBeFalse();
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
      expect(service.isLoading()).toBeFalse();
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
        expect(router.navigate).toHaveBeenCalledOnceWith([target]);
      });
    }

    it('also redirects from the root url', async () => {
      setup({ ...profileRow('trainer'), tenant: null }, '/');
      await service.refreshProfile();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/trainer']);
    });

    it('does not redirect when already on another page', async () => {
      setup({ ...profileRow('admin'), tenant: null }, '/profile');
      await service.refreshProfile();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('routes PASSWORD_RECOVERY to /reset-password without loading a profile', () => {
      setup(null);
      service.initialize();
      listener('PASSWORD_RECOVERY', null);
      expect(router.navigate).toHaveBeenCalledOnceWith(['/reset-password']);
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
      expect(router.navigate).toHaveBeenCalledOnceWith(['/register']);
      expect(profiles['select']).not.toHaveBeenCalled();
    });

    it('clears state and stops loading when the session ends', () => {
      setup(null);
      service.profile.set(asProfile(profileRow('user')));
      service.initialize();
      listener('SIGNED_OUT', null);
      expect(service.profile()).toBeNull();
      expect(service.tenant()).toBeNull();
      expect(service.isLoading()).toBeFalse();
    });
  });

  describe('signIn / signOut / patchTenant', () => {
    it('signIn returns null on success and the message on failure', async () => {
      setup(null);
      expect(await service.signIn('a@b.c', 'pw')).toBeNull();
      auth['signInWithPassword'].and.resolveTo({ error: { message: 'bad creds' } });
      expect(await service.signIn('a@b.c', 'pw')).toBe('bad creds');
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
