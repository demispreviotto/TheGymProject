import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PlanningService } from '../../../core/planning/planning.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';
import type { Planning } from '../../../core/planning/planning.types';

@Component({
  selector: 'app-my-planning-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, AppIconComponent],
  template: `
    <div class="space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">{{ 'myplan.planning.title' | translate }}</h1>
          <p class="text-sm text-neutral-400 mt-0.5">{{ service.plannings().length }} {{ 'planning.subtitle' | translate }}</p>
        </div>
        <button
          (click)="router.navigate(['/my-plan/planning/new'])"
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
          <p class="text-xs mt-1">{{ 'myplan.planning.empty.hint' | translate }}</p>
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
                    @if (plan.is_shared_with_friends) {
                      · <span class="text-[hsl(var(--tenant-primary))]">{{ 'myplan.share.friends' | translate }}</span>
                    }
                  </p>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <!-- Friend-share toggle -->
                  <button
                    (click)="toggleSharePanel(plan.id)"
                    [class]="shareButtonClass(plan)"
                    [title]="'myplan.share.friends' | translate"
                  >
                    <app-icon name="user-group" />
                  </button>
                  <button
                    (click)="router.navigate(['/my-plan/planning', plan.id])"
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

              <!-- Inline friend-share panel -->
              @if (activePanelId() === plan.id) {
                <div class="px-4 pb-4 pt-1 border-t border-neutral-800 bg-neutral-900/50 space-y-3">
                  <p class="text-xs text-neutral-500">{{ 'myplan.share.friends.hint' | translate }}</p>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-neutral-400">{{ 'myplan.share.friends' | translate }}</span>
                    <button
                      (click)="toggleSharedWithFriends(plan)"
                      [class]="sharedToggleClass(plan.is_shared_with_friends)"
                      role="switch"
                      [attr.aria-checked]="plan.is_shared_with_friends"
                    >
                      <span [class]="sharedThumbClass(plan.is_shared_with_friends)"></span>
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
export class MyPlanningListComponent implements OnInit {
  readonly service = inject(PlanningService);
  readonly router = inject(Router);

  readonly activePanelId = signal<string | null>(null);

  ngOnInit(): void { this.service.loadPlannings(); }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }

  toggleSharePanel(id: string): void {
    this.activePanelId.update(v => v === id ? null : id);
  }

  shareButtonClass(plan: Planning): string {
    const base = 'p-1.5 rounded-md transition-colors';
    return plan.is_shared_with_friends
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

  async toggleSharedWithFriends(plan: Planning): Promise<void> {
    await this.service.setSharedWithFriends(plan.id, !plan.is_shared_with_friends);
  }

  async confirmDelete(plan: Planning): Promise<void> {
    if (!confirm(`Delete "${plan.title}"? This will remove all its days and prescriptions.`)) return;
    await this.service.delete(plan.id);
  }
}
