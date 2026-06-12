import {
  Component, inject, signal, OnInit, ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';
import type { Profile, UserRole } from '../../../core/auth/auth.types';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe, AppIconComponent],
  template: `
    <div>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold text-neutral-100">{{ 'admin.users.title' | translate }}</h1>
          <p class="text-sm text-neutral-500 mt-0.5">{{ users().length }} total</p>
        </div>
        <button (click)="toggleInviteForm()"
          class="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--tenant-primary))] px-3 py-1.5 text-sm font-medium
                 text-[hsl(var(--tenant-contrast))] hover:bg-[hsl(var(--tenant-hover))] transition-colors">
          <app-icon name="plus" />
          {{ 'admin.users.invite' | translate }}
        </button>
      </div>

      @if (inviteFormOpen()) {
        <div class="rounded-xl border border-neutral-800 bg-neutral-900 p-4 mb-6 space-y-3">
          <p class="text-sm font-semibold text-neutral-200">{{ 'admin.users.invite' | translate }}</p>

          @if (inviteStep() === 'form') {
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input type="email" [ngModel]="inviteEmail()" (ngModelChange)="inviteEmail.set($event)"
                class="sm:col-span-2 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm
                       text-neutral-100 placeholder-neutral-500 focus:border-[hsl(var(--tenant-primary))]
                       focus:outline-none focus:ring-1 focus:ring-[hsl(var(--tenant-primary))]"
                placeholder="email@example.com" />
              <select [ngModel]="inviteRole()" (ngModelChange)="inviteRole.set($event)"
                class="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100
                       focus:border-[hsl(var(--tenant-primary))] focus:outline-none">
                <option value="free">free</option>
                <option value="trainer">trainer</option>
                <option value="user">user</option>
              </select>
            </div>
            <div class="flex gap-2">
              <button (click)="sendDirectInvite()" [disabled]="inviteState() === 'sending'"
                class="rounded-md bg-[hsl(var(--tenant-primary))] px-4 py-2 text-sm font-medium
                       text-[hsl(var(--tenant-contrast))] hover:bg-[hsl(var(--tenant-hover))]
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {{ inviteState() === 'sending' ? ('invite.generating' | translate) : ('invite.generate' | translate) }}
              </button>
              <button (click)="toggleInviteForm()"
                class="rounded-md px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors">
                {{ 'common.cancel' | translate }}
              </button>
            </div>
            @if (inviteState() === 'error' && inviteMessage()) {
              <p class="text-sm text-red-400">{{ inviteMessage() }}</p>
            }
          }

          @if (inviteStep() === 'ready') {
            <p class="text-xs text-neutral-400">
              Invite ready for <span class="text-neutral-200 font-medium">{{ inviteEmail() }}</span>
            </p>
            <div class="flex gap-2">
              <button (click)="shareInvite()"
                class="flex-1 rounded-md bg-[hsl(var(--tenant-primary))] px-4 py-2 text-sm font-medium
                       text-[hsl(var(--tenant-contrast))] hover:bg-[hsl(var(--tenant-hover))] transition-colors">
                {{ 'invite.share' | translate }}
              </button>
              <button (click)="resetInviteForm()"
                class="rounded-md px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors">
                {{ 'invite.another' | translate }}
              </button>
              <button (click)="toggleInviteForm()"
                class="rounded-md px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors">
                {{ 'common.close' | translate }}
              </button>
            </div>
            <p class="text-xs text-neutral-600">{{ 'invite.link.expiry' | translate }}</p>
          }
        </div>
      }

      @if (loading()) {
        <div class="space-y-2">
          @for (_ of [1, 2, 3, 4]; track $index) {
            <div class="h-14 rounded-lg bg-neutral-800 animate-pulse"></div>
          }
        </div>
      } @else if (users().length === 0) {
        <p class="text-sm text-neutral-500">{{ 'admin.users.empty' | translate }}</p>
      } @else {
        <div class="rounded-xl border border-neutral-800 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-neutral-800 bg-neutral-900">
                <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Name</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">{{ 'admin.users.role' | translate }}</th>
                <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide hidden md:table-cell">Joined</th>
                <th class="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-right">Active</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr class="border-b border-neutral-800 last:border-0 hover:bg-neutral-800/30">
                  <td class="px-4 py-3">
                    <p class="font-medium text-neutral-100">{{ user.name }}</p>
                  </td>
                  <td class="px-4 py-3 text-neutral-400 text-xs hidden sm:table-cell">{{ user.email }}</td>
                  <td class="px-4 py-3">
                    <select
                      [ngModel]="user.role"
                      (ngModelChange)="updateRole(user, $event)"
                      class="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300 focus:outline-none">
                      <option value="free">free</option>
                      <option value="user">user</option>
                      <option value="trainer">trainer</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td class="px-4 py-3 text-neutral-500 text-xs hidden md:table-cell">{{ formatDate(user.created_at) }}</td>
                  <td class="px-4 py-3 text-right">
                    <button
                      (click)="toggleActive(user)"
                      [class]="user.is_active
                        ? 'w-9 h-5 rounded-full bg-[hsl(var(--tenant-primary))] relative transition-colors'
                        : 'w-9 h-5 rounded-full bg-neutral-700 relative transition-colors'"
                      role="switch" [attr.aria-checked]="user.is_active">
                      <span [class]="user.is_active
                        ? 'absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all'
                        : 'absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all'">
                      </span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (actionError()) {
        <p class="mt-4 rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{{ actionError() }}</p>
      }
    </div>
  `,
})
export class AdminUsersComponent implements OnInit {
  private readonly supabase = inject(SUPABASE_CLIENT);

  readonly loading = signal(true);
  readonly users = signal<Profile[]>([]);
  readonly actionError = signal<string | null>(null);

  readonly inviteFormOpen = signal(false);
  readonly inviteEmail = signal('');
  readonly inviteRole = signal<'free' | 'trainer' | 'user'>('free');
  readonly inviteState = signal<'idle' | 'sending' | 'error'>('idle');
  readonly inviteMessage = signal<string | null>(null);
  readonly inviteStep = signal<'form' | 'ready'>('form');
  private inviteLink: string | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    this.loading.set(true);
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    this.users.set((data as Profile[]) ?? []);
    this.loading.set(false);
  }

  toggleInviteForm(): void {
    this.inviteFormOpen.update(v => !v);
    this.resetInviteForm();
  }

  resetInviteForm(): void {
    this.inviteEmail.set('');
    this.inviteRole.set('free');
    this.inviteState.set('idle');
    this.inviteMessage.set(null);
    this.inviteStep.set('form');
    this.inviteLink = null;
  }

  async sendDirectInvite(): Promise<void> {
    const email = this.inviteEmail().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.inviteState.set('error');
      this.inviteMessage.set('Enter a valid email address.');
      return;
    }
    this.inviteState.set('sending');
    this.inviteMessage.set(null);

    const { data, error } = await this.supabase.functions.invoke('invite-client', {
      body: { email, role: this.inviteRole() },
    });
    if (error) {
      this.inviteState.set('error');
      this.inviteMessage.set(error.message ?? 'Failed to generate invite.');
    } else {
      this.inviteLink = data?.inviteLink ?? null;
      this.inviteStep.set('ready');
      await this.loadUsers();
    }
  }

  async shareInvite(): Promise<void> {
    if (!this.inviteLink) return;
    const shareData = {
      title: 'Gym Planificación — Invitation',
      text: `You've been invited to join Gym Planificación! Tap the link to set up your account.`,
      url: this.inviteLink,
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(this.inviteLink);
    }
  }

  async updateRole(user: Profile, newRole: UserRole): Promise<void> {
    this.actionError.set(null);
    const { error } = await this.supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id);
    if (error) { this.actionError.set(error.message); return; }
    this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: newRole } : u));
  }

  async toggleActive(user: Profile): Promise<void> {
    this.actionError.set(null);
    const newActive = !user.is_active;
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_active: newActive })
      .eq('id', user.id);
    if (error) { this.actionError.set(error.message); return; }
    this.users.update(list => list.map(u => u.id === user.id ? { ...u, is_active: newActive } : u));
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
