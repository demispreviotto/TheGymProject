import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { PlanningService } from '../../../../core/planning/planning.service';
import { SUPABASE_CLIENT } from '../../../../core/supabase/supabase.client';
import { AuthService } from '../../../../core/auth/auth.service';
import { ClientDetailSheetComponent } from '../client-detail-sheet/client-detail-sheet.component';
import type { Profile } from '../../../../core/auth/auth.types';

@Component({
  selector: 'app-client-roster',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClientDetailSheetComponent],
  template: `
    <div>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold text-neutral-100">Clients</h1>
          <p class="text-sm text-neutral-500 mt-0.5">{{ activeClients().length }} active</p>
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-2">
          @for (_ of [1, 2, 3]; track $index) {
            <div class="h-14 rounded-lg bg-neutral-800 animate-pulse"></div>
          }
        </div>
      } @else {

        <!-- Active clients table -->
        @if (activeClients().length > 0) {
          <div class="rounded-xl border border-neutral-800 overflow-hidden mb-4">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-neutral-800 bg-neutral-900">
                  <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Client</th>
                  <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide hidden sm:table-cell">Plan</th>
                  <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide hidden md:table-cell">Joined</th>
                  <th class="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (client of activeClients(); track client.id) {
                  <tr
                    class="border-b border-neutral-800 last:border-0 hover:bg-neutral-800/50 cursor-pointer transition-colors"
                    (click)="openSheet(client)"
                  >
                    <td class="px-4 py-3">
                      <p class="font-medium text-neutral-100">{{ client.name }}</p>
                      <p class="text-xs text-neutral-500">{{ client.email }}</p>
                    </td>
                    <td class="px-4 py-3 text-neutral-400 hidden sm:table-cell">
                      {{ planTitle(client.assigned_planning_id) }}
                    </td>
                    <td class="px-4 py-3 text-neutral-400 hidden md:table-cell">
                      {{ formatDate(client.created_at) }}
                    </td>
                    <td class="px-4 py-3 text-right">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        Active
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="text-sm text-neutral-500 mb-4">No active clients yet.</p>
        }

        <!-- Inactive clients accordion -->
        @if (inactiveClients().length > 0) {
          <div class="rounded-xl border border-neutral-800 overflow-hidden">
            <button
              (click)="toggleInactive()"
              class="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-400 hover:bg-neutral-800/50 transition-colors"
            >
              <span>Inactive clients ({{ inactiveClients().length }})</span>
              <svg
                class="w-4 h-4 transition-transform"
                [class.rotate-180]="inactiveExpanded()"
                fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            @if (inactiveExpanded()) {
              <div class="border-t border-neutral-800">
                @for (client of inactiveClients(); track client.id) {
                  <div
                    class="flex items-center justify-between px-4 py-3 border-b border-neutral-800 last:border-0 hover:bg-neutral-800/50 cursor-pointer transition-colors"
                    (click)="openSheet(client)"
                  >
                    <div>
                      <p class="text-sm font-medium text-neutral-400">{{ client.name }}</p>
                      <p class="text-xs text-neutral-600">{{ client.email }}</p>
                    </div>
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-700 text-neutral-500">
                      Inactive
                    </span>
                  </div>
                }
              </div>
            }
          </div>
        }

      }
    </div>

    <!-- Client detail sheet -->
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

  toggleInactive(): void {
    this.inactiveExpanded.update(v => !v);
  }

  openSheet(client: Profile): void {
    this.selectedClient.set(client);
  }

  closeSheet(): void {
    this.selectedClient.set(null);
  }

  async onClientUpdated(): Promise<void> {
    await this.loadClients();
  }

  private async loadClients(): Promise<void> {
    this.loading.set(true);
    const tenantId = this.auth.profile()?.id;
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .neq('id', tenantId)   // exclude the trainer from their own roster
      .order('name');
    this.clients.set((data as Profile[]) ?? []);
    this.loading.set(false);
  }
}
