import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { TenantService } from '../../../core/tenant/tenant.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import type { UserRole } from '../../../core/auth/auth.types';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'app-profile-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe],
  template: `
    <div class="max-w-lg space-y-6">
      <h1 class="text-xl font-bold text-neutral-100">{{ 'profile.title' | translate }}</h1>

      <!-- Identity card -->
      <div class="rounded-xl border border-neutral-800 bg-neutral-900 divide-y divide-neutral-800">
        @if (profile(); as p) {
          <div class="grid grid-cols-2 gap-4 px-5 py-4">
            <div>
              <p class="text-xs text-neutral-500 mb-1">{{ 'profile.name' | translate }}</p>
              <p class="text-sm font-medium text-neutral-100">{{ p.name }}</p>
            </div>
            <div>
              <p class="text-xs text-neutral-500 mb-1">{{ 'profile.email' | translate }}</p>
              <p class="text-sm text-neutral-100 break-all">{{ p.email }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 px-5 py-4">
            <div>
              <p class="text-xs text-neutral-500 mb-1">{{ 'profile.role' | translate }}</p>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" [class]="roleClass(p.role)">
                {{ p.role }}
              </span>
            </div>
            <div>
              <p class="text-xs text-neutral-500 mb-1">{{ 'profile.since' | translate }}</p>
              <p class="text-sm text-neutral-100">{{ formatDate(p.created_at) }}</p>
            </div>
          </div>

          @if (tenant()) {
            <div class="px-5 py-4">
              <p class="text-xs text-neutral-500 mb-2">{{ 'profile.gym' | translate }}</p>
              <div class="flex items-center gap-3">
                <p class="text-sm font-medium text-neutral-100">{{ tenant()!.name }}</p>
                <span
                  class="w-5 h-5 rounded-full border border-neutral-700 flex-shrink-0"
                  [style]="'background-color:' + tenant()!.primary_hex"
                ></span>
              </div>
            </div>
          }
        }
      </div>

      <!-- Trainer branding panel -->
      @if (isTrainer()) {
        <div class="rounded-xl border border-neutral-800 bg-neutral-900">
          <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
            <h2 class="text-sm font-semibold text-neutral-100">{{ 'branding.title' | translate }}</h2>
            @if (!brandingUnlocked()) {
              <button
                (click)="brandingUnlocked.set(true)"
                class="text-xs text-neutral-400 hover:text-neutral-100 px-3 py-1.5 rounded-md border border-neutral-700 hover:border-neutral-500 transition-colors"
              >
                {{ 'branding.unlock' | translate }}
              </button>
            }
          </div>

          <div class="px-5 py-4 space-y-4">
            <!-- Gym name -->
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-neutral-400">{{ 'branding.gymname' | translate }}</label>
              <input
                type="text"
                [(ngModel)]="brandName"
                [attr.disabled]="!brandingUnlocked() ? '' : null"
                class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 disabled:opacity-40"
              />
            </div>

            <!-- Primary color -->
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-neutral-400">{{ 'branding.color' | translate }}</label>
              <div class="flex gap-3 items-center">
                <input
                  type="text"
                  [(ngModel)]="brandHex"
                  [attr.disabled]="!brandingUnlocked() ? '' : null"
                  (ngModelChange)="onHexChange($event)"
                  placeholder="#EF4444"
                  class="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 font-mono focus:outline-none focus:border-neutral-500 disabled:opacity-40"
                />
                <span
                  class="w-8 h-8 rounded-md border border-neutral-700 flex-shrink-0"
                  [style]="hexPreviewStyle()"
                ></span>
              </div>
              @if (hexInvalid()) {
                <p class="text-xs text-red-400">{{ 'branding.color.invalid' | translate }}</p>
              }
            </div>

            <!-- Logo SVG -->
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-neutral-400">{{ 'branding.logo' | translate }}</label>
              <p class="text-xs text-neutral-600">{{ 'branding.logo.hint' | translate }}</p>
              <textarea
                rows="4"
                [(ngModel)]="brandLogo"
                [attr.disabled]="!brandingUnlocked() ? '' : null"
                placeholder="<svg ...>...</svg>"
                class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-300 font-mono focus:outline-none focus:border-neutral-500 resize-none disabled:opacity-40"
              ></textarea>
            </div>

            @if (brandError()) {
              <p class="text-xs text-red-400">{{ brandError() }}</p>
            }

            @if (brandingUnlocked()) {
              <div class="flex gap-3 pt-1">
                <button
                  (click)="saveBranding()"
                  [attr.disabled]="brandSaving() || hexInvalid() ? '' : null"
                  class="flex-1 py-2 rounded-lg bg-[hsl(var(--tenant-primary))] text-[hsl(var(--tenant-contrast))] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {{ brandSaving() ? ('common.saving' | translate) : ('common.save' | translate) }}
                </button>
                <button
                  (click)="cancelBranding()"
                  class="px-4 py-2 rounded-lg border border-neutral-700 text-sm text-neutral-400 hover:text-neutral-100 hover:border-neutral-500 transition-colors"
                >
                  {{ 'common.cancel' | translate }}
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ProfilePageComponent {
  private readonly auth = inject(AuthService);
  private readonly tenantService = inject(TenantService);
  private readonly theme = inject(ThemeService);

  readonly profile = computed(() => this.auth.profile());
  readonly tenant = computed(() => this.auth.tenant());
  readonly isTrainer = computed(() => this.auth.profile()?.role === 'trainer');

  readonly brandingUnlocked = signal(false);
  readonly brandSaving = signal(false);
  readonly brandError = signal<string | null>(null);
  readonly hexInvalid = signal(false);

  brandName = this.auth.tenant()?.name ?? '';
  brandHex = this.auth.tenant()?.primary_hex ?? '#EF4444';
  brandLogo = this.auth.tenant()?.logo_svg ?? '';

  hexPreviewStyle(): string {
    return HEX_RE.test(this.brandHex) ? `background-color:${this.brandHex}` : 'background-color:#333';
  }

  onHexChange(value: string): void {
    this.hexInvalid.set(value.length > 0 && !HEX_RE.test(value));
    if (HEX_RE.test(value)) this.theme.applyHex(value);
  }

  async saveBranding(): Promise<void> {
    if (this.hexInvalid()) return;
    this.brandSaving.set(true);
    this.brandError.set(null);
    const err = await this.tenantService.update({
      name: this.brandName,
      primary_hex: this.brandHex,
      logo_svg: this.brandLogo || null,
    });
    this.brandSaving.set(false);
    if (err) { this.brandError.set(err); return; }
    this.brandingUnlocked.set(false);
  }

  cancelBranding(): void {
    const t = this.auth.tenant();
    this.brandName = t?.name ?? '';
    this.brandHex = t?.primary_hex ?? '#EF4444';
    this.brandLogo = t?.logo_svg ?? '';
    this.hexInvalid.set(false);
    this.brandError.set(null);
    this.brandingUnlocked.set(false);
    this.theme.applyFromTenant(t ?? null);
  }

  roleClass(role: UserRole): string {
    const map: Record<UserRole, string> = {
      trainer: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      user: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      free: 'bg-neutral-700 text-neutral-400',
    };
    return map[role];
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
