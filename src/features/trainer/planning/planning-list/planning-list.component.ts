import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PlanningService } from '../../../../core/planning/planning.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import type { Planning } from '../../../../core/planning/planning.types';

@Component({
  selector: 'app-planning-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <div class="space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">{{ 'planning.title' | translate }}</h1>
          <p class="text-sm text-neutral-400 mt-0.5">{{ service.plannings().length }} {{ 'planning.subtitle' | translate }}</p>
        </div>
        <button
          (click)="router.navigate(['/trainer/planning/new'])"
          class="px-4 py-2 rounded-md bg-neutral-100 text-neutral-950 text-sm font-medium hover:bg-white transition-colors"
        >
          {{ 'planning.new' | translate }}
        </button>
      </div>

      @if (service.loading()) {
        <p class="text-sm text-neutral-500">{{ 'common.loading' | translate }}</p>
      } @else if (service.plannings().length === 0) {
        <div class="text-center py-16 text-neutral-600">
          <p class="text-sm">{{ 'planning.empty' | translate }}</p>
          <p class="text-xs mt-1">{{ 'planning.empty.hint' | translate }}</p>
        </div>
      } @else {
        <div class="rounded-lg border border-neutral-800 overflow-hidden">
          @for (plan of service.plannings(); track plan.id) {
            <div class="border-b border-neutral-800 last:border-0">
              <div class="flex items-center gap-4 px-4 py-3 hover:bg-neutral-900 transition-colors">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-neutral-100 truncate">{{ plan.title }}</p>
                  <p class="text-xs text-neutral-500 mt-0.5">
                    {{ plan.use_auto_1rm ? ('planning.autorm' | translate) : ('planning.fixed' | translate) }}
                    · {{ 'planning.created' | translate }} {{ formatDate(plan.created_at) }}
                  </p>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <!-- Share toggle -->
                  <button
                    (click)="toggleSharePanel(plan.id)"
                    [class]="shareButtonClass(plan)"
                    [title]="'planning.share' | translate"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                    </svg>
                  </button>
                  <button
                    (click)="router.navigate(['/trainer/planning', plan.id])"
                    class="text-xs text-neutral-400 hover:text-neutral-100 px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
                  >
                    {{ 'common.edit' | translate }}
                  </button>
                  <button
                    (click)="confirmDelete(plan)"
                    class="text-xs text-neutral-400 hover:text-red-400 px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
                  >
                    {{ 'common.delete' | translate }}
                  </button>
                </div>
              </div>

              <!-- Inline share panel -->
              @if (activePanelId() === plan.id) {
                <div class="px-4 pb-4 pt-1 border-t border-neutral-800 bg-neutral-900/50 space-y-3">
                  <p class="text-xs text-neutral-500">{{ 'planning.share.hint' | translate }}</p>

                  <!-- UUID copy field -->
                  <div class="flex gap-2">
                    <input
                      readonly
                      [value]="plan.id"
                      class="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-300 font-mono focus:outline-none"
                    />
                    <button
                      (click)="copyId(plan.id)"
                      class="px-3 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-400 hover:text-neutral-100 hover:border-neutral-500 transition-colors whitespace-nowrap"
                    >
                      {{ copied() === plan.id ? ('common.copied' | translate) : ('common.copy' | translate) }}
                    </button>
                  </div>

                  <!-- Sharing toggle -->
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-neutral-400">{{ 'planning.share.enable' | translate }}</span>
                    <button
                      (click)="toggleShared(plan)"
                      [class]="sharedToggleClass(plan.is_shared_with_gym)"
                      role="switch"
                      [attr.aria-checked]="plan.is_shared_with_gym"
                    >
                      <span [class]="sharedThumbClass(plan.is_shared_with_gym)"></span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PlanningListComponent implements OnInit {
  readonly service = inject(PlanningService);
  readonly router = inject(Router);

  readonly activePanelId = signal<string | null>(null);
  readonly copied = signal<string | null>(null);

  ngOnInit(): void { this.service.loadPlannings(); }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }

  toggleSharePanel(id: string): void {
    this.activePanelId.update(v => v === id ? null : id);
  }

  shareButtonClass(plan: Planning): string {
    const base = 'p-1.5 rounded-md transition-colors';
    return plan.is_shared_with_gym
      ? `${base} text-[hsl(var(--tenant-primary))] bg-[hsl(var(--tenant-primary))]/10`
      : `${base} text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800`;
  }

  sharedToggleClass(active: boolean): string {
    const base = 'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none';
    return active ? `${base} bg-[hsl(var(--tenant-primary))]` : `${base} bg-neutral-700`;
  }

  sharedThumbClass(active: boolean): string {
    const base = 'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform';
    return active ? `${base} translate-x-4` : `${base} translate-x-1`;
  }

  async toggleShared(plan: Planning): Promise<void> {
    await this.service.setShared(plan.id, !plan.is_shared_with_gym);
  }

  async copyId(id: string): Promise<void> {
    await navigator.clipboard.writeText(id);
    this.copied.set(id);
    setTimeout(() => this.copied.set(null), 2000);
  }

  async confirmDelete(plan: Planning): Promise<void> {
    if (!confirm(`Delete "${plan.title}"? This will remove all its days and prescriptions.`)) return;
    await this.service.delete(plan.id);
  }
}
