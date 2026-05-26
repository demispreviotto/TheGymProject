import { Routes } from '@angular/router';
import { roleGuard } from '../core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'trainer',
    loadComponent: () =>
      import('../features/trainer/trainer-shell/trainer-shell.component').then(
        m => m.TrainerShellComponent,
      ),
    canActivate: [roleGuard(['trainer'])],
    children: [
      { path: '', redirectTo: 'exercises', pathMatch: 'full' },
      {
        path: 'exercises',
        loadComponent: () =>
          import('../features/trainer/exercises/exercise-list/exercise-list.component').then(
            m => m.ExerciseListComponent,
          ),
      },
      {
        path: 'exercises/new',
        loadComponent: () =>
          import('../features/trainer/exercises/exercise-form/exercise-form.component').then(
            m => m.ExerciseFormComponent,
          ),
      },
      {
        path: 'exercises/:id',
        loadComponent: () =>
          import('../features/trainer/exercises/exercise-form/exercise-form.component').then(
            m => m.ExerciseFormComponent,
          ),
      },
      {
        path: 'planning',
        loadComponent: () =>
          import('../features/trainer/planning/planning-list/planning-list.component').then(
            m => m.PlanningListComponent,
          ),
      },
      {
        path: 'planning/new',
        loadComponent: () =>
          import('../features/trainer/planning/planning-form/planning-form.component').then(
            m => m.PlanningFormComponent,
          ),
      },
      {
        path: 'planning/:id',
        loadComponent: () =>
          import('../features/trainer/planning/planning-form/planning-form.component').then(
            m => m.PlanningFormComponent,
          ),
      },
    ],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../features/client/client-shell/client-shell.component').then(
        m => m.ClientShellComponent,
      ),
    canActivate: [roleGuard(['user', 'trainer', 'free'])],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
