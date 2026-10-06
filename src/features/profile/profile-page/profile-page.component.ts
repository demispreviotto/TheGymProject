import { Component, inject, computed, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { TenantService } from '../../../core/tenant/tenant.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { InviteRequestService } from '../../../core/invite-requests/invite-request.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { PushToggleComponent } from '../push-toggle/push-toggle.component';
import type { UserRole } from '../../../core/auth/auth.types';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'app-profile-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe, PushToggleComponent],
  template: `
    <div class="max-w-lg space-y-6">
      <h1 class="text-xl font-bold text-neutral-100">{{ 'profile.title' | translate }}</h1>

      <app-push-toggle />

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

      <!-- Free user: invite friends section -->
      @if (isFree()) {
        <div class="rounded-xl border border-neutral-800 bg-neutral-900">
          <div class="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-neutral-100">{{ 'invite.friends.title' | translate }}</h2>
            <span class="text-xs text-neutral-500">
              {{ inviteService.remainingInvites() }} {{ 'invite.friends.remaining' | translate }}
            </span>
          </div>

          @if (inviteService.myRequests().length > 0) {
            <div class="px-5 py-3 space-y-2 border-b border-neutral-800">
              @for (req of inviteService.myRequests(); track req.id) {
                <div class="flex items-center justify-between text-sm">
                  <div>
                    <span class="text-neutral-300">{{ req.invitee_name }}</span>
                    <span class="text-neutral-600 ml-1 text-xs">{{ req.invitee_email }}</span>
                  </div>
                  <span [class]="reqStatusClass(req.status)" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                    {{ reqStatusLabel(req.status) }}
                  </span>
                </div>
              }
            </div>
          }

          @if (inviteService.remainingInvites() > 0) {
            <div class="px-5 py-4 space-y-3">
              @if (inviteSuccess()) {
                <p class="text-sm text-green-400">{{ 'invite.friends.sent' | translate }}</p>
              } @else {
                <div class="space-y-1.5">
                  <label class="text-xs font-medium text-neutral-400">{{ 'invite.friends.name' | translate }}</label>
                  <input type="text" name="invitee-name" [ngModel]="inviteeName()" (ngModelChange)="inviteeName.set($event)"
                    class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500"
                    placeholder="Their full name" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-xs font-medium text-neutral-400">{{ 'invite.email' | translate }}</label>
                  <input type="email" name="invitee-email" [ngModel]="inviteeEmail()" (ngModelChange)="inviteeEmail.set($event)"
                    class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500"
                    placeholder="their@email.com" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-xs font-medium text-neutral-400">{{ 'invite.friends.reason' | translate }}</label>
                  <textarea rows="2" name="invitee-reason" [ngModel]="inviteeReason()" (ngModelChange)="inviteeReason.set($event)"
                    class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 resize-none focus:outline-none focus:border-neutral-500"
                    placeholder="e.g. my training partner"></textarea>
                </div>
                <label class="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" name="invite-accepted" [ngModel]="inviteAccepted()" (ngModelChange)="inviteAccepted.set($event)"
                    class="mt-0.5 accent-[hsl(var(--tenant-primary))]" />
                  <span class="text-xs text-neutral-400">{{ 'invite.friends.responsibility' | translate }}</span>
                </label>
                @if (inviteError()) {
                  <p class="text-xs text-red-400">{{ inviteError() }}</p>
                }
                <button (click)="submitInviteRequest()" [disabled]="inviteSubmitting()"
                  class="w-full py-2 rounded-lg bg-[hsl(var(--tenant-primary))] text-[hsl(var(--tenant-contrast))] text-sm font-medium
                         hover:opacity-90 transition-opacity disabled:opacity-40">
                  {{ inviteSubmitting() ? ('invite.sending' | translate) : ('invite.friends.submit' | translate) }}
                </button>
              }
            </div>
          } @else {
            <div class="px-5 py-4">
              <p class="text-sm text-neutral-500">{{ 'invite.friends.limit' | translate }}</p>
            </div>
          }
        </div>
      }

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

          <!-- Read-only display (locked) -->
          @if (!brandingUnlocked()) {
            <div class="px-5 py-4 space-y-4">
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-neutral-500">{{ 'branding.gymname' | translate }}</p>
                <p class="text-sm text-neutral-300">{{ brandName || '—' }}</p>
              </div>
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-neutral-500">{{ 'branding.color' | translate }}</p>
                <div class="flex items-center gap-2">
                  <span
                    class="w-5 h-5 rounded border border-neutral-700 flex-shrink-0"
                    [style]="hexPreviewStyle()"
                  ></span>
                  <span class="text-sm font-mono text-neutral-300">{{ brandHex }}</span>
                </div>
              </div>
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-neutral-500">{{ 'branding.logo' | translate }}</p>
                <p class="text-xs text-neutral-500">{{ brandLogo ? ('branding.logo.set' | translate) : ('branding.logo.empty' | translate) }}</p>
              </div>
            </div>
          }

          <!-- Editable form (unlocked) -->
          @if (brandingUnlocked()) {
            <div class="px-5 py-4 space-y-4">
              <!-- Gym name -->
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-neutral-400">{{ 'branding.gymname' | translate }}</label>
                <input
                  type="text"
                  name="brand-name"
                  [(ngModel)]="brandName"
                  class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500"
                />
              </div>

              <!-- Primary color -->
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-neutral-400">{{ 'branding.color' | translate }}</label>
                <div class="flex gap-3 items-center">
                  <input
                    type="text"
                    name="brand-hex"
                    [(ngModel)]="brandHex"
                    (ngModelChange)="onHexChange($event)"
                    placeholder="#EF4444"
                    class="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 font-mono focus:outline-none focus:border-neutral-500"
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
                  name="brand-logo"
                  [(ngModel)]="brandLogo"
                  placeholder="<svg ...>...</svg>"
                  class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-300 font-mono focus:outline-none focus:border-neutral-500 resize-none"
                ></textarea>
              </div>

              @if (brandError()) {
                <p class="text-xs text-red-400">{{ brandError() }}</p>
              }

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
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ProfilePageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly tenantService = inject(TenantService);
  private readonly theme = inject(ThemeService);
  readonly inviteService = inject(InviteRequestService);

  readonly profile = computed(() => this.auth.profile());
  readonly tenant = computed(() => this.auth.tenant());
  readonly isTrainer = computed(() => this.auth.profile()?.role === 'trainer');
  readonly isFree = computed(() => {
    const role = this.auth.profile()?.role;
    return role === 'free' || role === 'admin';
  });

  // Invite request form state (free users only)
  readonly inviteeName = signal('');
  readonly inviteeEmail = signal('');
  readonly inviteeReason = signal('');
  readonly inviteAccepted = signal(false);
  readonly inviteSubmitting = signal(false);
  readonly inviteError = signal<string | null>(null);
  readonly inviteSuccess = signal(false);

  async ngOnInit(): Promise<void> {
    if (this.isFree()) await this.inviteService.loadMyRequests();
  }

  async submitInviteRequest(): Promise<void> {
    this.inviteError.set(null);
    const email = this.inviteeEmail().trim();
    const name = this.inviteeName().trim();
    const reason = this.inviteeReason().trim();
    if (!name || !email || !reason) { this.inviteError.set('Please fill in all fields.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.inviteError.set('Enter a valid email.'); return; }
    if (!this.inviteAccepted()) { this.inviteError.set('You must accept responsibility.'); return; }
    this.inviteSubmitting.set(true);
    const err = await this.inviteService.submitRequest(email, name, reason);
    this.inviteSubmitting.set(false);
    if (err) { this.inviteError.set(err); return; }
    this.inviteSuccess.set(true);
    this.inviteeName.set('');
    this.inviteeEmail.set('');
    this.inviteeReason.set('');
    this.inviteAccepted.set(false);
  }

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
      admin:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      trainer: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      user:    'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      free:    'bg-neutral-700 text-neutral-400',
    };
    return map[role];
  }

  reqStatusClass(status: 'pending' | 'approved' | 'rejected'): string {
    const map = {
      pending:  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border border-green-500/30',
      rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
    };
    return map[status];
  }

  reqStatusLabel(status: 'pending' | 'approved' | 'rejected'): string {
    const map = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
    return map[status];
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
