import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { TenantBrandingComponent } from '../../../shared/components/tenant-branding/tenant-branding.component';

@Component({
  selector: 'app-trainer-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TenantBrandingComponent],
  template: `
    <div class="min-h-screen bg-neutral-950 text-neutral-100">
      <header class="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <app-tenant-branding />
        <button
          (click)="auth.signOut()"
          class="text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
        >
          Sign out
        </button>
      </header>
      <main class="p-6">
        <h1 class="text-xl font-semibold">Trainer Dashboard</h1>
        <p class="mt-1 text-sm text-neutral-400">Welcome, {{ auth.profile()?.name }}</p>
      </main>
    </div>
  `,
})
export class TrainerShellComponent {
  readonly auth = inject(AuthService);
}
