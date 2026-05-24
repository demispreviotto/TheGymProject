import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import type { UserRole } from '../auth/auth.types';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const profile = auth.profile();
    if (!profile) return router.createUrlTree(['/login']);
    if (!allowedRoles.includes(profile.role)) return router.createUrlTree(['/login']);
    return true;
  };
