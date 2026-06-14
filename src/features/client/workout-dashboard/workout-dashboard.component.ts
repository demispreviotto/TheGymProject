import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkoutService, WorkoutPlanFull, WorkoutPrescribed, LogPayload } from '../../../core/workout/workout.service';
import { PlanningService } from '../../../core/planning/planning.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';
import { CountdownTimerService } from '../../../core/timer/countdown-timer.service';
import type { ExigenceLevel } from '../../../core/planning/planning.types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  imports: [FormsModule, TranslatePipe, AppIconComponent],
  template: `
    <div class="max-w-lg mx-auto">

      @if (loading()) {
        <div class="space-y-4">
          @for (_ of skeletons; track $index) {
            <div class="h-40 rounded-xl bg-neutral-800 animate-pulse"></div>
          }
        </div>

      } @else if (!assignedPlanId()) {
        <div class="flex flex-col items-center py-12 text-center gap-4">
          <div class="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
            <app-icon name="bolt" iconClass="w-8 h-8 text-neutral-500" />
          </div>
          <h2 class="text-lg font-semibold text-neutral-100">{{ 'dashboard.noplan.title' | translate }}</h2>
          <p class="text-sm text-neutral-400 max-w-[280px]">{{ 'dashboard.noplan.body' | translate }}</p>
        </div>

        @if (isSelfManagedUser()) {
          <!-- Self-managed: own plans (free / admin / trainer) -->
          <div class="mt-2 rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
            @if (planningService.plannings().length > 0) {
              <p class="text-sm font-medium text-neutral-100">You have {{ planningService.plannings().length }} plan(s). Set one as active to start training.</p>
              <button
                (click)="router.navigate([planningRoute()])"
                class="w-full py-2.5 rounded-lg bg-[hsl(var(--tenant-primary))] text-[hsl(var(--tenant-contrast))] text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Go to my plans
              </button>
            } @else {
              <p class="text-sm font-medium text-neutral-100">You don't have any plans yet.</p>
              <p class="text-xs text-neutral-500">Create your first plan to start tracking workouts.</p>
              <button
                (click)="router.navigate([planningNewRoute()])"
                class="w-full py-2.5 rounded-lg bg-[hsl(var(--tenant-primary))] text-[hsl(var(--tenant-contrast))] text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Create a plan
              </button>
            }
          </div>
        } @else {
          <!-- Trainer-assigned user: connect by shared plan ID -->
          <div class="mt-2 rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
            <div>
              <p class="text-sm font-medium text-neutral-100">{{ 'dashboard.connect.title' | translate }}</p>
              <p class="text-xs text-neutral-500 mt-0.5">{{ 'dashboard.connect.hint' | translate }}</p>
            </div>
            <div class="flex gap-2">
              <input
                type="text"
                [(ngModel)]="connectInput"
                [placeholder]="'dashboard.connect.placeholder' | translate"
                class="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 font-mono placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
              />
              <button
                (click)="connectPlan()"
                [attr.disabled]="connectLoading() ? '' : null"
                class="px-4 py-2 rounded-lg bg-[hsl(var(--tenant-primary))] text-[hsl(var(--tenant-contrast))] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap"
              >
                {{ connectLoading() ? ('dashboard.connect.connecting' | translate) : ('dashboard.connect.button' | translate) }}
              </button>
            </div>
            @if (connectError()) {
              <p class="text-xs text-red-400">{{ connectError()! | translate }}</p>
            }
          </div>
        }

      } @else if (rows().length > 0) {
        <div class="mb-5">
          <h1 class="text-xl font-bold text-neutral-100">{{ plan()?.title }}</h1>
          <p class="text-sm text-neutral-500 mt-0.5">{{ 'dashboard.day' | translate }} {{ activeDay() }}</p>
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
                <button
                  (click)="startTimer(row.prescribed.rest_time_minutes)"
                  [attr.disabled]="timerService.isActive() ? '' : null"
                  title="Start rest timer"
                  class="flex-shrink-0 p-1.5 rounded-lg text-neutral-500 hover:text-neutral-100 hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <app-icon name="timer" iconClass="w-4 h-4" />
                </button>
              </div>

              @if (row.suggestedWeight !== null) {
                <p class="text-xs text-neutral-500 mb-3">
                  {{ 'dashboard.suggested' | translate }}: <span class="text-neutral-300 font-medium">{{ row.suggestedWeight }} kg</span>
                </p>
              }

              <!-- Standard mode: one shared weight + reps -->
              @if (row.prescribed.tracking_mode === 'standard') {
                <div class="flex gap-3">
                  <div class="flex-1">
                    <label class="text-xs text-neutral-500 mb-1 block">{{ 'dashboard.weight' | translate }}</label>
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
                    <label class="text-xs text-neutral-500 mb-1 block">{{ 'dashboard.reps' | translate }}</label>
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
                      <span class="text-xs text-neutral-500 w-16 flex-shrink-0">{{ 'dashboard.round' | translate }} {{ r + 1 }}</span>
                      <input
                        type="number" min="0" step="0.5"
                        [value]="input.weight ?? ''"
                        (input)="updateInput(i, r, 'weight', $event)"
                        [attr.disabled]="row.isCompleted ? '' : null"
                        placeholder="kg"
                        class="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 disabled:opacity-40"
                      />
                      <input
                        type="number" min="0"
                        [value]="input.reps ?? ''"
                        (input)="updateInput(i, r, 'reps', $event)"
                        [attr.disabled]="row.isCompleted ? '' : null"
                        placeholder="reps"
                        class="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 disabled:opacity-40"
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
                <app-icon name="check" />
                {{ row.isCompleted ? ('dashboard.completed' | translate) : ('dashboard.complete' | translate) }}
              </button>
            </div>
          }
        </div>

        <div class="mt-6 pb-10">
          <button
            (click)="openFinish()"
            class="w-full py-3 rounded-xl bg-[hsl(var(--tenant-primary))] text-[hsl(var(--tenant-contrast))] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {{ 'dashboard.finish' | translate }}
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
        <h2 class="text-lg font-bold text-neutral-100 mb-1">{{ 'dashboard.session.finish' | translate }}</h2>
        <p class="text-sm text-neutral-400 mb-6">{{ 'dashboard.session.how' | translate }}</p>

        <div class="flex justify-center gap-2 mb-8">
          @for (star of stars; track star) {
            <button (click)="subjectiveScore.set(star)" class="transition-transform hover:scale-110">
              <app-icon name="star"
                [iconClass]="'w-10 h-10 transition-colors ' + (star <= subjectiveScore() ? 'text-yellow-400' : 'text-neutral-600')" />
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
            {{ saving() ? ('common.saving' | translate) : ('common.confirm' | translate) }}
          </button>
        </div>
      </div>
    }
  `,
})
export class WorkoutDashboardComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly workoutService = inject(WorkoutService);
  readonly planningService = inject(PlanningService);
  private readonly supabase = inject(SUPABASE_CLIENT);
  readonly router = inject(Router);
  readonly timerService = inject(CountdownTimerService);

  readonly loading = signal(true);
  readonly plan = signal<WorkoutPlanFull | null>(null);
  readonly activeDay = signal(1);
  readonly rows = signal<WorkoutRowState[]>([]);
  readonly finishDrawerOpen = signal(false);
  readonly subjectiveScore = signal(0);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly assignedPlanId = computed(() => this.auth.profile()?.assigned_planning_id ?? null);
  readonly isSelfManagedUser = computed(() => {
    const role = this.auth.profile()?.role;
    return role === 'free' || role === 'admin' || role === 'trainer';
  });

  readonly planningRoute = computed(() =>
    this.auth.profile()?.role === 'trainer' ? '/trainer/planning' : '/my-plan/planning'
  );

  readonly planningNewRoute = computed(() =>
    this.auth.profile()?.role === 'trainer' ? '/trainer/planning/new' : '/my-plan/planning/new'
  );

  readonly skeletons = [1, 2, 3];
  readonly stars = [1, 2, 3, 4, 5];

  // Plan connect
  connectInput = '';
  readonly connectLoading = signal(false);
  readonly connectError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    if (this.isSelfManagedUser()) {
      this.planningService.loadPlannings();
    }
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

  startTimer(restMinutes: number): void {
    this.timerService.start(Math.round(restMinutes * 60));
  }

  ngOnDestroy(): void {
    this.timerService.cancel();
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

  async connectPlan(): Promise<void> {
    this.connectError.set(null);
    const id = this.connectInput.trim();
    if (!UUID_RE.test(id)) {
      this.connectError.set('dashboard.connect.err.format');
      return;
    }
    this.connectLoading.set(true);
    const plan = await this.planningService.lookupSharedPlan(id);
    if (!plan) {
      this.connectError.set('dashboard.connect.err.notfound');
      this.connectLoading.set(false);
      return;
    }
    const userId = this.auth.profile()?.id;
    if (userId) {
      await this.supabase
        .from('profiles')
        .update({ assigned_planning_id: plan.id })
        .eq('id', userId);
      this.auth.profile.update(p => p ? { ...p, assigned_planning_id: plan.id } : p);
    }
    this.connectInput = '';
    this.connectLoading.set(false);
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
