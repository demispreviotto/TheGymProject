import {
  Component,
  input,
  output,
  signal,
  computed,
  OnChanges,
  SimpleChanges,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { PlanningService } from '../../../../core/planning/planning.service';
import { HlmSheetComponent } from '../../../../shared/ui/sheet/hlm-sheet.component';
import type { Profile } from '../../../../core/auth/auth.types';
import type { Planning } from '../../../../core/planning/planning.types';
import { SUPABASE_CLIENT } from '../../../../core/supabase/supabase.client';

@Component({
  selector: 'app-client-detail-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSheetComponent],
  template: `
    <hlm-sheet [open]="!!client()" title="Client Details" (closed)="closed.emit()">
      @if (client(); as c) {
        <div class="space-y-5">

          <!-- Profile info -->
          <div class="space-y-2">
            <div>
              <p class="text-xs text-neutral-500">Name</p>
              <p class="text-sm text-neutral-100 font-medium">{{ c.name }}</p>
            </div>
            <div>
              <p class="text-xs text-neutral-500">Email</p>
              <p class="text-sm text-neutral-100">{{ c.email }}</p>
            </div>
            <div>
              <p class="text-xs text-neutral-500">Role</p>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-800 text-neutral-300">
                {{ c.role }}
              </span>
            </div>
            <div>
              <p class="text-xs text-neutral-500">Member since</p>
              <p class="text-sm text-neutral-100">{{ formatDate(c.created_at) }}</p>
            </div>
          </div>

          <div class="border-t border-neutral-800"></div>

          <!-- Plan assignment -->
          <div>
            <p class="text-xs text-neutral-500 mb-2">Assigned Training Plan</p>
            <select
              [value]="selectedPlanId()"
              (change)="onPlanChange($event)"
              [attr.disabled]="saving() ? '' : null"
              class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 disabled:opacity-40"
            >
              <option value="">— No plan —</option>
              @for (plan of plannings(); track plan.id) {
                <option [value]="plan.id">{{ plan.title }}</option>
              }
            </select>
          </div>

          <!-- Active toggle -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-100 font-medium">Active account</p>
              <p class="text-xs text-neutral-500 mt-0.5">Inactive clients are hidden from the main roster</p>
            </div>
            <button
              (click)="toggleActive()"
              [attr.disabled]="saving() ? '' : null"
              [class]="toggleClass()"
              role="switch"
              [attr.aria-checked]="isActive()"
            >
              <span [class]="thumbClass()"></span>
            </button>
          </div>

          @if (error()) {
            <p class="text-sm text-red-400">{{ error() }}</p>
          }

        </div>
      }
    </hlm-sheet>
  `,
})
export class ClientDetailSheetComponent implements OnChanges {
  private readonly planningService = inject(PlanningService);
  private readonly supabase = inject(SUPABASE_CLIENT);

  readonly client = input<Profile | null>(null);
  readonly closed = output<void>();
  readonly updated = output<void>();

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedPlanId = signal('');
  readonly isActive = signal(true);

  readonly plannings = computed(() => this.planningService.plannings());

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['client']) {
      const c = this.client();
      this.selectedPlanId.set(c?.assigned_planning_id ?? '');
      this.isActive.set(c?.is_active ?? true);
      this.error.set(null);
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  toggleClass(): string {
    const base = 'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40';
    return this.isActive() ? `${base} bg-[hsl(var(--tenant-primary))]` : `${base} bg-neutral-700`;
  }

  thumbClass(): string {
    const base = 'inline-block h-4 w-4 transform rounded-full bg-white transition-transform';
    return this.isActive() ? `${base} translate-x-6` : `${base} translate-x-1`;
  }

  async onPlanChange(event: Event): Promise<void> {
    const planId = (event.target as HTMLSelectElement).value || null;
    const clientId = this.client()?.id;
    if (!clientId) return;
    this.saving.set(true);
    this.error.set(null);
    const err = await this.planningService.assignPlanning(clientId, planId);
    if (err) this.error.set(err);
    else {
      this.selectedPlanId.set(planId ?? '');
      this.updated.emit();
    }
    this.saving.set(false);
  }

  async toggleActive(): Promise<void> {
    const clientId = this.client()?.id;
    if (!clientId) return;
    const next = !this.isActive();
    this.saving.set(true);
    this.error.set(null);
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_active: next })
      .eq('id', clientId);
    if (error) {
      this.error.set(error.message);
    } else {
      this.isActive.set(next);
      this.updated.emit();
    }
    this.saving.set(false);
  }
}
