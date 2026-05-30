import { Component, inject, OnInit, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ExerciseService } from '../../../../core/exercises/exercise.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ExerciseEditSheetComponent } from '../exercise-edit-sheet/exercise-edit-sheet.component';
import type { Exercise } from '../../../../core/planning/planning.types';

@Component({
  selector: 'app-exercise-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ExerciseEditSheetComponent],
  template: `
    <div class="space-y-4">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">Exercises</h1>
          <p class="text-sm text-neutral-400 mt-0.5">
            {{ tenantExercises().length }} custom · {{ globalExercises().length }} global
          </p>
        </div>
        <button
          (click)="router.navigate(['/trainer/exercises/new'])"
          class="px-4 py-2 rounded-md bg-neutral-100 text-neutral-950 text-sm font-medium hover:bg-white transition-colors"
        >
          + New Exercise
        </button>
      </div>

      @if (service.loading()) {
        <p class="text-sm text-neutral-500">Loading…</p>
      } @else {

        <!-- Tenant exercises -->
        @if (tenantExercises().length > 0) {
          <section class="space-y-2">
            <h2 class="text-xs font-semibold uppercase tracking-widest text-neutral-500">Your Library</h2>
            <div class="rounded-lg border border-neutral-800 overflow-hidden">
              @for (ex of tenantExercises(); track ex.id) {
                <div class="flex items-center gap-4 px-4 py-3 border-b border-neutral-800 last:border-0 hover:bg-neutral-900 transition-colors">
                  <button
                    class="flex-1 min-w-0 text-left"
                    (click)="openSheet(ex)"
                  >
                    <p class="text-sm font-medium text-neutral-100 truncate">{{ ex.name }}</p>
                    @if (ex.muscle_groups.length > 0) {
                      <p class="text-xs text-neutral-500 mt-0.5">{{ muscleNames(ex) }}</p>
                    }
                  </button>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <button
                      (click)="openSheet(ex)"
                      class="text-xs text-neutral-400 hover:text-neutral-100 px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      (click)="confirmDelete(ex)"
                      class="text-xs text-neutral-400 hover:text-red-400 px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- Global exercises (read-only — click opens locked sheet) -->
        @if (globalExercises().length > 0) {
          <section class="space-y-2">
            <h2 class="text-xs font-semibold uppercase tracking-widest text-neutral-500">Global Defaults</h2>
            <div class="rounded-lg border border-neutral-800 overflow-hidden opacity-60">
              @for (ex of globalExercises(); track ex.id) {
                <button
                  class="w-full flex items-center gap-4 px-4 py-3 border-b border-neutral-800 last:border-0 hover:bg-neutral-900 transition-colors text-left"
                  (click)="openSheet(ex)"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-neutral-300 truncate">{{ ex.name }}</p>
                    @if (ex.muscle_groups.length > 0) {
                      <p class="text-xs text-neutral-600 mt-0.5">{{ muscleNames(ex) }}</p>
                    }
                  </div>
                  <span class="text-xs text-neutral-600 flex-shrink-0">Global</span>
                </button>
              }
            </div>
          </section>
        }

        @if (service.exercises().length === 0) {
          <div class="text-center py-16 text-neutral-600">
            <p class="text-sm">No exercises yet.</p>
            <p class="text-xs mt-1">Create your first exercise to get started.</p>
          </div>
        }
      }
    </div>

    <app-exercise-edit-sheet
      [exercise]="selectedExercise()"
      (closed)="closeSheet()"
    />
  `,
})
export class ExerciseListComponent implements OnInit {
  readonly service = inject(ExerciseService);
  readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly selectedExercise = signal<Exercise | null>(null);

  readonly tenantExercises = computed<Exercise[]>(() =>
    this.service.exercises().filter(e => e.tenant_id === this.auth.profile()?.id),
  );

  readonly globalExercises = computed<Exercise[]>(() =>
    this.service.exercises().filter(e => e.tenant_id === null),
  );

  ngOnInit(): void {
    this.service.load();
  }

  muscleNames(ex: Exercise): string {
    return ex.muscle_groups.map(g => g.name).join(' · ');
  }

  openSheet(ex: Exercise): void {
    this.selectedExercise.set(ex);
  }

  closeSheet(): void {
    this.selectedExercise.set(null);
  }

  async confirmDelete(ex: Exercise): Promise<void> {
    if (!confirm(`Delete "${ex.name}"? This cannot be undone.`)) return;
    await this.service.delete(ex.id);
  }
}
