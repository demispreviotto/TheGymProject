import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('../features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'accept-invite',
    loadComponent: () =>
      import('../features/auth/accept-invite/accept-invite.component').then(m => m.AcceptInviteComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('../features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
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
        canActivate: [roleGuard(['user', 'trainer', 'free', 'admin'])],
        loadComponent: () =>
          import('../features/client/workout-dashboard/workout-dashboard.component').then(
            m => m.WorkoutDashboardComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['admin'])],
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('../features/admin/admin-page/admin-page.component').then(
                m => m.AdminPageComponent,
              ),
          },
          // Requests and users now share the admin page; keep the old URLs working.
          { path: 'requests', pathMatch: 'full', redirectTo: '' },
          { path: 'users', pathMatch: 'full', redirectTo: '' },
        ],
      },
      {
        path: 'my-plan',
        canActivate: [roleGuard(['free', 'admin'])],
        loadComponent: () =>
          import('../features/free/my-plan-shell/my-plan-shell.component').then(
            m => m.MyPlanShellComponent,
          ),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('../features/free/my-library/my-library-page.component').then(
                m => m.MyLibraryPageComponent,
              ),
          },
          // Plans and exercises now share one page; keep the old URLs (and the forms' "back") working.
          { path: 'planning', pathMatch: 'full', redirectTo: '' },
          { path: 'exercises', pathMatch: 'full', redirectTo: '' },
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
            path: 'exercises/new',
            loadComponent: () =>
              import(
                '../features/trainer/exercises/exercise-form/exercise-form.component'
              ).then(m => m.ExerciseFormComponent),
          },
          {
            path: 'friends',
            loadComponent: () =>
              import('../features/free/my-friends/my-friends.component').then(
                m => m.MyFriendsComponent,
              ),
          },
        ],
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
