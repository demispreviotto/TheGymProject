import { Routes } from '@angular/router';
import { roleGuard } from '../core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'trainer',
    loadComponent: () =>
      import('../features/trainer/trainer-shell/trainer-shell.component').then(
        (m) => m.TrainerShellComponent,
      ),
    canActivate: [roleGuard(['trainer'])],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../features/client/client-shell/client-shell.component').then(
        (m) => m.ClientShellComponent,
      ),
    canActivate: [roleGuard(['user', 'trainer', 'free'])],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
