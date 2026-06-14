import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PlanningService } from '../../../../core/planning/planning.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../../shared/ui/icons/app-icon.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ToggleComponent } from '../../../../shared/components/toggle/toggle.component';
import { formatDate } from '../../../../shared/utils/format';
import { copyWithTimeout } from '../../../../shared/utils/share';
import type { Planning } from '../../../../core/planning/planning.types';

@Component({
  selector: 'app-planning-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, AppIconComponent, EmptyStateComponent, ToggleComponent],
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
        <app-empty-state
          [message]="'planning.empty' | translate"
          [hint]="'planning.empty.hint' | translate"
        />
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
                  <button
                    (click)="toggleSharePanel(plan.id)"
                    [class]="shareButtonClass(plan)"
                    [title]="'planning.share' | translate"
                  >
                    <app-icon name="share" />
                  </button>
                  <button
                    (click)="router.navigate(['/trainer/planning', plan.id])"
                    class="text-xs text-neutral-400 hover:text-neutral-100 px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
                    [title]="'common.edit' | translate"
                  >
                    {{ 'common.edit' | translate }}
                  </button>
                  <button
                    (click)="confirmDelete(plan)"
                    class="text-xs text-neutral-400 hover:text-red-400 px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
                    [title]="'common.delete' | translate"
                  >
                    {{ 'common.delete' | translate }}
                  </button>
                </div>
              </div>

              @if (activePanelId() === plan.id) {
                <div class="px-4 pb-4 pt-1 border-t border-neutral-800 bg-neutral-900/50 space-y-3">
                  <p class="text-xs text-neutral-500">{{ 'planning.share.hint' | translate }}</p>

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

                  <div class="flex items-center justify-between">
                    <span class="text-xs text-neutral-400">{{ 'planning.share.enable' | translate }}</span>
                    <app-toggle
                      [active]="plan.is_shared_with_gym"
                      (changed)="toggleShared(plan)"
                    />
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

  readonly formatDate = formatDate;

  ngOnInit(): void { this.service.loadPlannings(); }

  toggleSharePanel(id: string): void {
    this.activePanelId.update(v => v === id ? null : id);
  }

  shareButtonClass(plan: Planning): string {
    const base = 'p-1.5 rounded-md transition-colors';
    return plan.is_shared_with_gym
      ? `${base} text-[hsl(var(--tenant-primary))] bg-[hsl(var(--tenant-primary))]/10`
      : `${base} text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800`;
  }

  async toggleShared(plan: Planning): Promise<void> {
    await this.service.setShared(plan.id, !plan.is_shared_with_gym);
  }

  async copyId(id: string): Promise<void> {
    await copyWithTimeout(id, v => this.copied.set(v));
  }

  async confirmDelete(plan: Planning): Promise<void> {
    if (!confirm(`Delete "${plan.title}"? This will remove all its days and prescriptions.`)) return;
    await this.service.delete(plan.id);
  }
}
