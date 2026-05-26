import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TenantBrandingComponent } from '../../../shared/components/tenant-branding/tenant-branding.component';

@Component({
  selector: 'app-trainer-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TenantBrandingComponent],
  template: `
    <div class="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">

      <!-- Top header -->
      <header class="border-b border-neutral-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <app-tenant-branding />
        <div class="flex items-center gap-4">
          <span class="text-sm text-neutral-400">{{ auth.profile()?.name }}</span>
          <button
            (click)="auth.signOut()"
            class="text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div class="flex flex-1 overflow-hidden">

        <!-- Sidebar -->
        <nav class="w-56 border-r border-neutral-800 flex flex-col gap-1 p-3 flex-shrink-0">
          <a
            routerLink="exercises"
            routerLinkActive="bg-neutral-800 text-neutral-100"
            class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
            Exercises
          </a>
          <a
            routerLink="planning"
            routerLinkActive="bg-neutral-800 text-neutral-100"
            class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            Planning
          </a>
        </nav>

        <!-- Main content -->
        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>

      </div>
    </div>
  `,
})
export class TrainerShellComponent {
  readonly auth = inject(AuthService);
}
