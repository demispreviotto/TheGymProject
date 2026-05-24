import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { TenantBrandingComponent } from '../../../shared/components/tenant-branding/tenant-branding.component';

@Component({
  selector: 'app-client-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TenantBrandingComponent],
  template: `
    <div class="min-h-screen bg-neutral-950 text-neutral-100">
      <header class="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <app-tenant-branding />
        <button
          (click)="auth.signOut()"
          class="text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
        >
          Sign out
        </button>
      </header>
      <main class="p-4">
        <h1 class="text-lg font-semibold">My Workouts</h1>
        <p class="mt-1 text-sm text-neutral-400">Welcome, {{ auth.profile()?.name }}</p>
      </main>
    </div>
  `,
})
export class ClientShellComponent {
  readonly auth = inject(AuthService);
}
