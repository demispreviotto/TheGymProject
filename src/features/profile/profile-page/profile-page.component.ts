import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import type { UserRole } from '../../../core/auth/auth.types';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-lg">
      <h1 class="text-xl font-bold text-neutral-100 mb-6">Profile</h1>

      @if (profile(); as p) {
        <div class="rounded-xl border border-neutral-800 bg-neutral-900 divide-y divide-neutral-800">

          <div class="grid grid-cols-2 gap-4 px-5 py-4">
            <div>
              <p class="text-xs text-neutral-500 mb-1">Name</p>
              <p class="text-sm font-medium text-neutral-100">{{ p.name }}</p>
            </div>
            <div>
              <p class="text-xs text-neutral-500 mb-1">Email</p>
              <p class="text-sm text-neutral-100 break-all">{{ p.email }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 px-5 py-4">
            <div>
              <p class="text-xs text-neutral-500 mb-1">Role</p>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    [class]="roleClass(p.role)">
                {{ p.role }}
              </span>
            </div>
            <div>
              <p class="text-xs text-neutral-500 mb-1">Member since</p>
              <p class="text-sm text-neutral-100">{{ formatDate(p.created_at) }}</p>
            </div>
          </div>

          @if (p.tenant_name) {
            <div class="px-5 py-4">
              <p class="text-xs text-neutral-500 mb-2">Gym / Trainer</p>
              <div class="flex items-center gap-3">
                <p class="text-sm font-medium text-neutral-100">{{ p.tenant_name }}</p>
                @if (tenantSwatchStyle()) {
                  <span
                    class="w-5 h-5 rounded-full border border-neutral-700 flex-shrink-0"
                    [style]="tenantSwatchStyle()"
                    title="Brand colour"
                  ></span>
                }
              </div>
            </div>
          }

        </div>
      }
    </div>
  `,
})
export class ProfilePageComponent {
  private readonly auth = inject(AuthService);

  readonly profile = computed(() => this.auth.profile());

  readonly tenantSwatchStyle = computed(() => {
    const hex = this.auth.profile()?.tenant_primary_hex;
    if (!hex) return null;
    return `background-color: ${hex}`;
  });

  roleClass(role: UserRole): string {
    const map: Record<UserRole, string> = {
      trainer: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      user: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      free: 'bg-neutral-700 text-neutral-400',
    };
    return map[role];
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
