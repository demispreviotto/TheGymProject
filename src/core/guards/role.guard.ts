import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import type { UserRole } from '../auth/auth.types';

const waitForAuth = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return { auth, router, ready$: toObservable(auth.isLoading).pipe(filter(l => !l), take(1)) };
};

export const authGuard: CanActivateFn = () => {
  const { auth, router, ready$ } = waitForAuth();
  return ready$.pipe(map(() => auth.profile() ? true : router.createUrlTree(['/login'])));
};

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn =>
  () => {
    const { auth, router, ready$ } = waitForAuth();
    return ready$.pipe(
      map(() => {
        const profile = auth.profile();
        if (!profile) return router.createUrlTree(['/login']);
        if (!allowedRoles.includes(profile.role)) return router.createUrlTree(['/login']);
        return true;
      }),
    );
  };
