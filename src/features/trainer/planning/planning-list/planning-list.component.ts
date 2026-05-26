import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PlanningService } from '../../../../core/planning/planning.service';
import type { Planning } from '../../../../core/planning/planning.types';

@Component({
  selector: 'app-planning-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">Training Plans</h1>
          <p class="text-sm text-neutral-400 mt-0.5">{{ service.plannings().length }} plans</p>
        </div>
        <button
          (click)="router.navigate(['/trainer/planning/new'])"
          class="px-4 py-2 rounded-md bg-neutral-100 text-neutral-950 text-sm font-medium
                 hover:bg-white transition-colors"
        >
          + New Plan
        </button>
      </div>

      @if (service.loading()) {
        <p class="text-sm text-neutral-500">Loading…</p>
      } @else if (service.plannings().length === 0) {
        <div class="text-center py-16 text-neutral-600">
          <p class="text-sm">No training plans yet.</p>
          <p class="text-xs mt-1">Create your first plan to assign to clients.</p>
        </div>
      } @else {
        <div class="rounded-lg border border-neutral-800 overflow-hidden">
          @for (plan of service.plannings(); track plan.id) {
            <div class="flex items-center gap-4 px-4 py-3 border-b border-neutral-800 last:border-0
                         hover:bg-neutral-900 transition-colors">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-100 truncate">{{ plan.title }}</p>
                <p class="text-xs text-neutral-500 mt-0.5">
                  {{ plan.use_auto_1rm ? 'Auto 1RM enabled' : 'Fixed weights' }}
                  · Created {{ formatDate(plan.created_at) }}
                </p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  (click)="router.navigate(['/trainer/planning', plan.id])"
                  class="text-xs text-neutral-400 hover:text-neutral-100 px-2 py-1
                         rounded hover:bg-neutral-800 transition-colors"
                >
                  Edit
                </button>
                <button
                  (click)="confirmDelete(plan)"
                  class="text-xs text-neutral-400 hover:text-red-400 px-2 py-1
                         rounded hover:bg-neutral-800 transition-colors"
                >
                  Delete
                </button>
              </div>
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

  ngOnInit(): void {
    this.service.loadPlannings();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }

  async confirmDelete(plan: Planning): Promise<void> {
    if (!confirm(`Delete "${plan.title}"? This will remove all its days and prescriptions.`)) return;
    await this.service.delete(plan.id);
  }
}
