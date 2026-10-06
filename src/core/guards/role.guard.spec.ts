import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import type { Profile, UserRole } from '../auth/auth.types';
import { authGuard, roleGuard } from './role.guard';

describe('route guards', () => {
  const profile = signal<Profile | null>(null);
  const isLoading = signal(false);

  const invoke = (guard: CanActivateFn) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;

  const run = async (guard: CanActivateFn): Promise<boolean | UrlTree> => {
    const result = invoke(guard);
    expect(isObservable(result)).toBeTrue();
    const pending = firstValueFrom(result);
    TestBed.flushEffects();
    return pending;
  };

  const asUser = (role: UserRole) => profile.set({ id: 'u1', role } as Profile);
  const loginTree = () => TestBed.inject(Router).createUrlTree(['/login']).toString();

  beforeEach(() => {
    profile.set(null);
    isLoading.set(false);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { profile, isLoading } }],
    });
  });

  describe('authGuard', () => {
    it('allows any authenticated user', async () => {
      asUser('free');
      expect(await run(authGuard)).toBeTrue();
    });

    it('redirects to /login without a profile', async () => {
      const result = await run(authGuard);
      expect(result.toString()).toBe(loginTree());
    });

    it('waits until auth has finished loading', async () => {
      isLoading.set(true);
      asUser('user');
      let settled = false;
      const pending = firstValueFrom(invoke(authGuard)).then(v => { settled = true; return v; });

      TestBed.flushEffects();
      await Promise.resolve();
      expect(settled).toBeFalse();

      isLoading.set(false);
      TestBed.flushEffects();
      expect(await pending).toBeTrue();
    });
  });

  describe('roleGuard', () => {
    it('allows a role in the allowed list', async () => {
      asUser('trainer');
      expect(await run(roleGuard(['trainer']))).toBeTrue();
    });

    it('allows any of several roles', async () => {
      asUser('admin');
      expect(await run(roleGuard(['free', 'admin']))).toBeTrue();
    });

    it('redirects a role outside the allowed list', async () => {
      asUser('free');
      expect((await run(roleGuard(['trainer', 'admin']))).toString()).toBe(loginTree());
    });

    it('redirects when there is no profile', async () => {
      expect((await run(roleGuard(['trainer']))).toString()).toBe(loginTree());
    });
  });
});
