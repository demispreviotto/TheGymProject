import {
  Component, inject, signal, computed, OnInit, ChangeDetectionStrategy,
} from '@angular/core';
import { PlanningService } from '../../../../core/planning/planning.service';
import { SUPABASE_CLIENT } from '../../../../core/supabase/supabase.client';
import { AuthService } from '../../../../core/auth/auth.service';
import { ClientDetailSheetComponent } from '../client-detail-sheet/client-detail-sheet.component';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../../shared/ui/icons/app-icon.component';
import type { Profile } from '../../../../core/auth/auth.types';

@Component({
  selector: 'app-client-roster',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClientDetailSheetComponent, TranslatePipe, FormsModule, AppIconComponent],
  template: `
    <div>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold text-neutral-100">{{ 'clients.title' | translate }}</h1>
          <p class="text-sm text-neutral-500 mt-0.5">{{ activeClients().length }} {{ 'clients.active' | translate }}</p>
        </div>
        <button (click)="toggleInviteForm()"
          class="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--tenant-primary))] px-3 py-1.5 text-sm font-medium
                 text-[hsl(var(--tenant-contrast))] hover:bg-[hsl(var(--tenant-hover))] transition-colors">
          <app-icon name="user-plus" />
          {{ 'invite.button' | translate }}
        </button>
      </div>

      @if (inviteFormOpen()) {
        <div class="rounded-xl border border-neutral-800 bg-neutral-900 p-4 mb-6 space-y-3">
          <p class="text-sm font-medium text-neutral-300">{{ 'invite.email' | translate }}</p>

          @if (inviteStep() === 'form') {
            <div class="flex gap-2">
              <input type="email" [ngModel]="inviteEmail()" (ngModelChange)="inviteEmail.set($event)"
                (keydown.enter)="generateInvite()"
                class="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm
                       text-neutral-100 placeholder-neutral-500 focus:border-[hsl(var(--tenant-primary))]
                       focus:outline-none focus:ring-1 focus:ring-[hsl(var(--tenant-primary))]"
                placeholder="client@example.com" />
              <button (click)="generateInvite()" [disabled]="inviteState() === 'sending'"
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
          @for (_ of [1, 2, 3]; track $index) {
            <div class="h-14 rounded-lg bg-neutral-800 animate-pulse"></div>
          }
        </div>
      } @else {

        @if (activeClients().length > 0) {
          <div class="rounded-xl border border-neutral-800 overflow-hidden mb-4">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-neutral-800 bg-neutral-900">
                  <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">{{ 'clients.title' | translate }}</th>
                  <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide hidden sm:table-cell">{{ 'clients.col.plan' | translate }}</th>
                  <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide hidden md:table-cell">{{ 'clients.col.joined' | translate }}</th>
                  <th class="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-right">{{ 'clients.col.status' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (client of activeClients(); track client.id) {
                  <tr class="border-b border-neutral-800 last:border-0 hover:bg-neutral-800/50 cursor-pointer transition-colors"
                      (click)="openSheet(client)">
                    <td class="px-4 py-3">
                      <p class="font-medium text-neutral-100">{{ client.name }}</p>
                      <p class="text-xs text-neutral-500">{{ client.email }}</p>
                    </td>
                    <td class="px-4 py-3 text-neutral-400 hidden sm:table-cell">{{ planTitle(client.assigned_planning_id) }}</td>
                    <td class="px-4 py-3 text-neutral-400 hidden md:table-cell">{{ formatDate(client.created_at) }}</td>
                    <td class="px-4 py-3 text-right">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        {{ 'common.active' | translate }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="text-sm text-neutral-500 mb-4">{{ 'clients.empty' | translate }}</p>
        }

        @if (inactiveClients().length > 0) {
          <div class="rounded-xl border border-neutral-800 overflow-hidden">
            <button
              (click)="toggleInactive()"
              class="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-400 hover:bg-neutral-800/50 transition-colors"
            >
              <span>{{ 'clients.inactive' | translate }} ({{ inactiveClients().length }})</span>
              <app-icon name="chevron-down"
                [iconClass]="'w-4 h-4 transition-transform' + (inactiveExpanded() ? ' rotate-180' : '')" />
            </button>
            @if (inactiveExpanded()) {
              <div class="border-t border-neutral-800">
                @for (client of inactiveClients(); track client.id) {
                  <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800 last:border-0 hover:bg-neutral-800/50 cursor-pointer transition-colors"
                       (click)="openSheet(client)">
                    <div>
                      <p class="text-sm font-medium text-neutral-400">{{ client.name }}</p>
                      <p class="text-xs text-neutral-600">{{ client.email }}</p>
                    </div>
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-700 text-neutral-500">
                      {{ 'common.inactive' | translate }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </div>

    <app-client-detail-sheet
      [client]="selectedClient()"
      (closed)="closeSheet()"
      (updated)="onClientUpdated()"
    />
  `,
})
export class ClientRosterComponent implements OnInit {
  private readonly planningService = inject(PlanningService);
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly clients = signal<Profile[]>([]);
  readonly selectedClient = signal<Profile | null>(null);
  readonly inactiveExpanded = signal(false);
  readonly inviteFormOpen = signal(false);
  readonly inviteEmail = signal('');
  readonly inviteState = signal<'idle' | 'sending' | 'error'>('idle');
  readonly inviteMessage = signal<string | null>(null);
  readonly inviteStep = signal<'form' | 'ready'>('form');
  private inviteLink: string | null = null;

  readonly activeClients = computed(() => this.clients().filter(c => c.is_active));
  readonly inactiveClients = computed(() => this.clients().filter(c => !c.is_active));

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadClients(), this.planningService.loadPlannings()]);
  }

  planTitle(planId: string | null): string {
    if (!planId) return '—';
    return this.planningService.plannings().find(p => p.id === planId)?.title ?? '—';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  toggleInactive(): void { this.inactiveExpanded.update(v => !v); }

  toggleInviteForm(): void {
    this.inviteFormOpen.update(v => !v);
    this.resetInviteForm();
  }

  resetInviteForm(): void {
    this.inviteEmail.set('');
    this.inviteState.set('idle');
    this.inviteMessage.set(null);
    this.inviteStep.set('form');
    this.inviteLink = null;
  }

  async generateInvite(): Promise<void> {
    const email = this.inviteEmail().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.inviteState.set('error');
      this.inviteMessage.set('Enter a valid email address.');
      return;
    }
    this.inviteState.set('sending');
    this.inviteMessage.set(null);
    const { data, error } = await this.supabase.functions.invoke('invite-client', { body: { email } });
    if (error) {
      this.inviteState.set('error');
      this.inviteMessage.set(error.message ?? 'Failed to generate invite.');
    } else {
      this.inviteLink = data?.inviteLink ?? null;
      this.inviteStep.set('ready');
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
  openSheet(client: Profile): void { this.selectedClient.set(client); }
  closeSheet(): void { this.selectedClient.set(null); }
  async onClientUpdated(): Promise<void> { await this.loadClients(); }

  private async loadClients(): Promise<void> {
    this.loading.set(true);
    const tenantId = this.auth.profile()?.id;
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', this.auth.tenant()?.id ?? tenantId)
      .neq('id', tenantId)
      .order('name');
    this.clients.set((data as Profile[]) ?? []);
    this.loading.set(false);
  }
}
