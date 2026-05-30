import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkoutService, WorkoutPlanFull, WorkoutPrescribed, LogPayload } from '../../../core/workout/workout.service';
import type { ExigenceLevel } from '../../../core/planning/planning.types';

interface RoundInput {
  weight: number | null;
  reps: number | null;
}

interface WorkoutRowState {
  prescribed: WorkoutPrescribed;
  suggestedWeight: number | null;
  inputs: RoundInput[];
  isCompleted: boolean;
}

@Component({
  selector: 'app-workout-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-lg mx-auto">

      @if (loading()) {
        <div class="space-y-4">
          @for (_ of skeletons; track $index) {
            <div class="h-40 rounded-xl bg-neutral-800 animate-pulse"></div>
          }
        </div>

      } @else if (!assignedPlanId()) {
        <div class="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div class="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
            <svg class="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-neutral-100">No plan assigned yet</h2>
          <p class="text-sm text-neutral-400 max-w-[280px]">
            Contact your trainer to get a personalised training plan assigned to your account.
          </p>
        </div>

      } @else if (rows().length > 0) {
        <div class="mb-5">
          <h1 class="text-xl font-bold text-neutral-100">{{ plan()?.title }}</h1>
          <p class="text-sm text-neutral-500 mt-0.5">Day {{ activeDay() }}</p>
        </div>

        <div class="space-y-3">
          @for (row of rows(); track row.prescribed.id; let i = $index) {
            <div [class]="exerciseCardClass(row.isCompleted)">

              <!-- Header -->
              <div class="flex items-start gap-2 mb-3">
                <span class="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold"
                      [class]="exigenceClass(row.prescribed.exigence)">
                  {{ row.prescribed.exigence }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-neutral-100 text-sm leading-tight">
                    {{ row.prescribed.exercise?.name ?? 'Exercise' }}
                  </p>
                  <p class="text-xs text-neutral-500 mt-0.5">
                    {{ row.prescribed.rounds }} rounds · {{ row.prescribed.target_reps }} reps · {{ row.prescribed.rest_time_minutes }} min rest
                  </p>
                </div>
              </div>

              @if (row.suggestedWeight !== null) {
                <p class="text-xs text-neutral-500 mb-3">
                  Suggested: <span class="text-neutral-300 font-medium">{{ row.suggestedWeight }} kg</span>
                </p>
              }

              <!-- Standard mode: one shared weight + reps -->
              @if (row.prescribed.tracking_mode === 'standard') {
                <div class="flex gap-3">
                  <div class="flex-1">
                    <label class="text-xs text-neutral-500 mb-1 block">Weight (kg)</label>
                    <input
                      type="number" min="0" step="0.5"
                      [value]="row.inputs[0].weight ?? ''"
                      (input)="updateInput(i, 0, 'weight', $event)"
                      [attr.disabled]="row.isCompleted ? '' : null"
                      [attr.placeholder]="row.suggestedWeight ?? 0"
                      class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 disabled:opacity-40"
                    />
                  </div>
                  <div class="flex-1">
                    <label class="text-xs text-neutral-500 mb-1 block">Reps</label>
                    <input
                      type="number" min="0"
                      [value]="row.inputs[0].reps ?? ''"
                      (input)="updateInput(i, 0, 'reps', $event)"
                      [attr.disabled]="row.isCompleted ? '' : null"
                      [attr.placeholder]="row.prescribed.target_reps"
                      class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 disabled:opacity-40"
                    />
                  </div>
                </div>

              <!-- Granular / failure mode: per-round pairs -->
              } @else {
                <div class="space-y-2">
                  @for (input of row.inputs; track $index; let r = $index) {
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-neutral-500 w-16 flex-shrink-0">Round {{ r + 1 }}</span>
                      <input
                        type="number" min="0" step="0.5"
                        [value]="input.weight ?? ''"
                        (input)="updateInput(i, r, 'weight', $event)"
                        [attr.disabled]="row.isCompleted ? '' : null"
                        placeholder="kg"
                        class="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 disabled:opacity-40"
                      />
                      <input
                        type="number" min="0"
                        [value]="input.reps ?? ''"
                        (input)="updateInput(i, r, 'reps', $event)"
                        [attr.disabled]="row.isCompleted ? '' : null"
                        placeholder="reps"
                        class="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 disabled:opacity-40"
                      />
                    </div>
                  }
                </div>
              }

              <!-- Complete toggle -->
              <button
                (click)="toggleComplete(i)"
                [class]="completeButtonClass(row.isCompleted)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {{ row.isCompleted ? 'Completed' : 'Mark complete' }}
              </button>
            </div>
          }
        </div>

        <div class="mt-6 pb-10">
          <button
            (click)="openFinish()"
            class="w-full py-3 rounded-xl bg-[hsl(var(--tenant-primary))] text-[hsl(var(--tenant-contrast))] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Finish Workout
          </button>
        </div>

      } @else {
        <div class="flex flex-col items-center justify-center py-20 text-center gap-2">
          <p class="text-neutral-400 text-sm">No exercises scheduled for Day {{ activeDay() }}.</p>
        </div>
      }
    </div>

    <!-- Session finalization drawer -->
    @if (finishDrawerOpen()) {
      <div class="fixed inset-0 z-50 bg-black/60" (click)="closeFinish()"></div>
      <div class="fixed inset-x-0 bottom-0 z-50 bg-neutral-900 border-t border-neutral-800 rounded-t-2xl px-6 pt-5 pb-10">
        <div class="w-10 h-1 bg-neutral-700 rounded-full mx-auto mb-6"></div>
        <h2 class="text-lg font-bold text-neutral-100 mb-1">Finish Workout</h2>
        <p class="text-sm text-neutral-400 mb-6">How did this session feel?</p>

        <div class="flex justify-center gap-2 mb-8">
          @for (star of stars; track star) {
            <button (click)="subjectiveScore.set(star)" class="transition-transform hover:scale-110">
              <svg
                class="w-10 h-10 transition-colors"
                [class]="star <= subjectiveScore() ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-600'"
                fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
            </button>
          }
        </div>

        @if (saveError()) {
          <p class="text-sm text-red-400 mb-4 text-center">{{ saveError() }}</p>
        }

        <div class="flex gap-3">
          <button
            (click)="closeFinish()"
            class="flex-1 py-3 rounded-xl border border-neutral-700 text-sm text-neutral-400 hover:text-neutral-100 hover:border-neutral-500 transition-colors"
          >
            Cancel
          </button>
          <button
            (click)="confirmFinish()"
            [attr.disabled]="(subjectiveScore() === 0 || saving()) ? '' : null"
            class="flex-1 py-3 rounded-xl bg-[hsl(var(--tenant-primary))] text-[hsl(var(--tenant-contrast))] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {{ saving() ? 'Saving…' : 'Confirm' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class WorkoutDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly workoutService = inject(WorkoutService);

  readonly loading = signal(true);
  readonly plan = signal<WorkoutPlanFull | null>(null);
  readonly activeDay = signal(1);
  readonly rows = signal<WorkoutRowState[]>([]);
  readonly finishDrawerOpen = signal(false);
  readonly subjectiveScore = signal(0);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly assignedPlanId = computed(() => this.auth.profile()?.assigned_planning_id ?? null);

  readonly skeletons = [1, 2, 3];
  readonly stars = [1, 2, 3, 4, 5];

  async ngOnInit(): Promise<void> {
    await this.loadWorkout();
  }

  exerciseCardClass(isCompleted: boolean): string {
    const base = 'rounded-xl border p-4 transition-colors';
    return isCompleted
      ? `${base} border-green-700/50 bg-green-950/30`
      : `${base} border-neutral-800 bg-neutral-900`;
  }

  exigenceClass(exigence: ExigenceLevel): string {
    const map: Record<ExigenceLevel, string> = {
      A: 'bg-red-500/20 text-red-400 border border-red-500/30',
      B: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      C: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      D: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    };
    return map[exigence];
  }

  completeButtonClass(isCompleted: boolean): string {
    const base = 'mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors';
    return isCompleted
      ? `${base} bg-green-800/40 text-green-400 hover:bg-green-800/60`
      : `${base} bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100`;
  }

  updateInput(rowIndex: number, roundIndex: number, field: 'weight' | 'reps', event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === '' ? null : parseFloat(raw);
    this.rows.update(rows => {
      const updated = [...rows];
      const row = { ...updated[rowIndex] };
      const inputs = [...row.inputs];
      inputs[roundIndex] = { ...inputs[roundIndex], [field]: isNaN(value as number) ? null : value };
      row.inputs = inputs;
      updated[rowIndex] = row;
      return updated;
    });
  }

  toggleComplete(rowIndex: number): void {
    this.rows.update(rows => {
      const updated = [...rows];
      updated[rowIndex] = { ...updated[rowIndex], isCompleted: !updated[rowIndex].isCompleted };
      return updated;
    });
  }

  openFinish(): void {
    this.subjectiveScore.set(0);
    this.saveError.set(null);
    this.finishDrawerOpen.set(true);
  }

  closeFinish(): void {
    this.finishDrawerOpen.set(false);
  }

  async confirmFinish(): Promise<void> {
    const profile = this.auth.profile();
    const planId = this.assignedPlanId();
    if (!profile || !planId) return;

    this.saving.set(true);
    this.saveError.set(null);

    const logs: LogPayload[] = [];
    for (const row of this.rows()) {
      const p = row.prescribed;
      if (p.tracking_mode === 'standard') {
        const inp = row.inputs[0];
        for (let r = 1; r <= p.rounds; r++) {
          logs.push({
            exercise_id: p.exercise_id,
            round_number: r,
            weight_used: inp.weight ?? 0,
            reps_performed: inp.reps ?? p.target_reps,
            is_completed: row.isCompleted,
          });
        }
      } else {
        row.inputs.forEach((inp, idx) => {
          logs.push({
            exercise_id: p.exercise_id,
            round_number: idx + 1,
            weight_used: inp.weight ?? 0,
            reps_performed: inp.reps ?? p.target_reps,
            is_completed: row.isCompleted,
          });
        });
      }
    }

    const error = await this.workoutService.saveSession(
      profile.id,
      planId,
      this.activeDay(),
      this.subjectiveScore(),
      logs,
    );

    this.saving.set(false);

    if (error) {
      this.saveError.set(error);
      return;
    }

    this.finishDrawerOpen.set(false);
    await this.loadWorkout();
  }

  private async loadWorkout(): Promise<void> {
    this.loading.set(true);
    this.rows.set([]);

    const planId = this.assignedPlanId();
    const profile = this.auth.profile();
    if (!planId || !profile) {
      this.loading.set(false);
      return;
    }

    const [planFull, lastSession] = await Promise.all([
      this.workoutService.loadPlan(planId),
      this.workoutService.loadLastSession(profile.id, planId),
    ]);

    if (!planFull) {
      this.loading.set(false);
      return;
    }

    const availableDays = planFull.planning_days.map(d => d.day_number);
    const activeDay = this.workoutService.resolveActiveDay(lastSession, availableDays);
    const dayData = planFull.planning_days.find(d => d.day_number === activeDay);
    const sorted = [...(dayData?.prescribed_exercises ?? [])].sort(
      (a, b) => a.sorting_order - b.sorting_order,
    );

    const rows = await Promise.all(
      sorted.map(async p => {
        const lastLog = planFull.use_auto_1rm
          ? await this.workoutService.loadLastLog(profile.id, p.exercise_id)
          : null;
        const suggestedWeight = this.workoutService.computeSuggestedWeight(
          lastLog,
          p.target_reps,
          p.suggested_first_weight,
        );
        const inputCount = p.tracking_mode === 'standard' ? 1 : p.rounds;
        const inputs: RoundInput[] = Array.from({ length: inputCount }, () => ({
          weight: null,
          reps: null,
        }));
        return { prescribed: p, suggestedWeight, inputs, isCompleted: false };
      }),
    );

    this.plan.set(planFull);
    this.activeDay.set(activeDay);
    this.rows.set(rows);
    this.loading.set(false);
  }
}
