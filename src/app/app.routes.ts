import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('../features/shell/app-shell/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
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
              import(
                '../features/trainer/exercises/exercise-list/exercise-list.component'
              ).then(m => m.ExerciseListComponent),
          },
          {
            path: 'exercises/new',
            loadComponent: () =>
              import(
                '../features/trainer/exercises/exercise-form/exercise-form.component'
              ).then(m => m.ExerciseFormComponent),
          },
          {
            path: 'planning',
            loadComponent: () =>
              import(
                '../features/trainer/planning/planning-list/planning-list.component'
              ).then(m => m.PlanningListComponent),
          },
          {
            path: 'planning/new',
            loadComponent: () =>
              import(
                '../features/trainer/planning/planning-form/planning-form.component'
              ).then(m => m.PlanningFormComponent),
          },
          {
            path: 'planning/:id',
            loadComponent: () =>
              import(
                '../features/trainer/planning/planning-form/planning-form.component'
              ).then(m => m.PlanningFormComponent),
          },
          {
            path: 'clients',
            loadComponent: () =>
              import('../features/trainer/clients/client-roster/client-roster.component').then(
                m => m.ClientRosterComponent,
              ),
          },
        ],
      },
      {
        path: 'dashboard',
        canActivate: [roleGuard(['user', 'trainer', 'free'])],
        loadComponent: () =>
          import('../features/client/workout-dashboard/workout-dashboard.component').then(
            m => m.WorkoutDashboardComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../features/profile/profile-page/profile-page.component').then(
            m => m.ProfilePageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
