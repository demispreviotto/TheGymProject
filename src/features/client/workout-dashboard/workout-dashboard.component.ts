import {
  Component, inject, signal, computed, OnInit, ChangeDetectionStrategy,
  afterNextRender, DOCUMENT, Injector,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkoutService, WorkoutPlanFull, LogPayload, SessionContext } from '../../../core/workout/workout.service';
import { PlanningService } from '../../../core/planning/planning.service';
import { ProgramService } from '../../../core/program/program.service';
import { describePosition, resolvePosition } from '../../../core/program/program-position';
import type { ActiveProgram, ProgramPosition } from '../../../core/program/program.types';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';
import type { Exercise } from '../../../core/planning/planning.types';
import { CountdownTimerService } from '../../../core/timer/countdown-timer.service';
import type {
  InputChange, RoundInput, RoundInputField, WorkoutRowState,
} from '../../../core/workout/workout-row.types';
import {
  completedCount, createRow, currentRound, dayPosition, firstIncompleteId, isRowCompleted,
  progressPercent, sessionVolume, withRoundDone,
} from '../../../core/workout/workout-stats';
import { SessionClock } from '../../../core/workout/session-clock';
import { applyDraft, draftKey, toDraft } from '../../../core/workout/workout-draft';
import { WorkoutDraftService } from '../../../core/workout/workout-draft.service';
import { ExerciseCardComponent, exerciseCardDomId } from './components/exercise-card.component';
import { ExerciseInfoComponent } from './components/exercise-info.component';
import { ProgramInfo, WorkoutSummaryComponent } from './components/workout-summary.component';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-workout-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe, AppIconComponent, ExerciseCardComponent, ExerciseInfoComponent, WorkoutSummaryComponent],
  providers: [SessionClock],
  template: `
    <div class="max-w-lg mx-auto">

      @if (loading()) {
        <div class="space-y-4">
          @for (_ of skeletons; track $index) {
            <div class="h-40 rounded-xl bg-neutral-900 animate-pulse"></div>
          }
        </div>

      } @else if (!currentPlanId()) {
        <div class="flex flex-col items-center py-12 text-center gap-4">
          <div class="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
            <app-icon name="bolt" iconClass="w-8 h-8 text-neutral-500" />
          </div>
          <h2 class="text-lg font-semibold text-neutral-100">{{ 'dashboard.noplan.title' | translate }}</h2>
          <p class="text-sm text-neutral-400 max-w-[280px]">{{ 'dashboard.noplan.body' | translate }}</p>
        </div>

        @if (isSelfManagedUser()) {
          <!-- Self-managed: own plans (free / admin / trainer) -->
          <div class="mt-2 rounded-xl bg-neutral-900 p-5 space-y-3">
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
          <div class="mt-2 rounded-xl bg-neutral-900 p-5 space-y-3">
            <div>
              <p class="text-sm font-medium text-neutral-100">{{ 'dashboard.connect.title' | translate }}</p>
              <p class="text-xs text-neutral-500 mt-0.5">{{ 'dashboard.connect.hint' | translate }}</p>
            </div>
            <div class="flex gap-2">
              <input
                type="text"
                [(ngModel)]="connectInput"
                [placeholder]="'dashboard.connect.placeholder' | translate"
                class="min-w-0 flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 font-mono placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
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
        <div class="space-y-3">
          <app-workout-summary
            [title]="plan()?.title ?? ''"
            [dayPosition]="dayPos()"
            [completed]="completedRows()"
            [total]="rows().length"
            [percent]="progress()"
            [volume]="volume()"
            [durationSeconds]="clock.elapsedSeconds()"
            [program]="programInfo()"
          />

          @for (row of rows(); track row.prescribed.id; let i = $index) {
            <app-exercise-card
              [row]="row"
              [expanded]="openId() === row.prescribed.id"
              [usesAutoRm]="usesAutoRm()"
              (expand)="openCard(row.prescribed.id)"
              (inputChange)="setInput(i, $event)"
              (completeSet)="completeSet(i)"
              (undoRound)="undoRound(i, $event)"
              (info)="infoExercise.set(row.prescribed.exercise)"
            />
          }
        </div>

        <app-exercise-info [exercise]="infoExercise()" (closed)="infoExercise.set(null)" />

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
export class WorkoutDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly workoutService = inject(WorkoutService);
  readonly planningService = inject(PlanningService);
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  readonly router = inject(Router);
  readonly timerService = inject(CountdownTimerService);
  readonly clock = inject(SessionClock);
  private readonly drafts = inject(WorkoutDraftService);
  private readonly programs = inject(ProgramService);

  readonly loading = signal(true);
  readonly plan = signal<WorkoutPlanFull | null>(null);
  readonly activeDay = signal(1);
  /** Plan being trained now: the current program phase's plan, else the plan assigned directly. */
  readonly currentPlanId = signal<string | null>(null);
  readonly activeProgram = signal<ActiveProgram | null>(null);
  /** Exercise whose info overlay is open. */
  readonly infoExercise = signal<Exercise | null>(null);
  readonly programPosition = signal<ProgramPosition | null>(null);
  readonly rows = signal<WorkoutRowState[]>([]);
  readonly finishDrawerOpen = signal(false);
  readonly subjectiveScore = signal(0);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  /** Card the user opened by hand. Null means "follow the current exercise". */
  readonly manualOpenId = signal<string | null>(null);

  readonly assignedPlanId = computed(() => this.auth.profile()?.assigned_planning_id ?? null);
  readonly isSelfManagedUser = computed(() => {
    const role = this.auth.profile()?.role;
    return role === 'free' || role === 'admin' || role === 'trainer';
  });

  readonly planningRoute = computed(() =>
    this.auth.profile()?.role === 'trainer' ? '/trainer' : '/my-plan'
  );

  readonly planningNewRoute = computed(() =>
    this.auth.profile()?.role === 'trainer' ? '/trainer/planning/new' : '/my-plan/planning/new'
  );

  // Summary card
  readonly usesAutoRm = computed(() => this.plan()?.use_auto_1rm ?? false);
  readonly completedRows = computed(() => completedCount(this.rows()));
  readonly progress = computed(() => progressPercent(this.completedRows(), this.rows().length));
  readonly volume = computed(() => sessionVolume(this.rows()));
  /** Program name plus week/phase while following one; null on a directly assigned plan. */
  readonly programInfo = computed<ProgramInfo | null>(() => {
    const active = this.activeProgram();
    const position = this.programPosition();
    const label = active && position ? describePosition(active.phases, position) : null;
    return active && label ? { title: active.program.title, ...label } : null;
  });
  readonly dayPos = computed(() =>
    dayPosition(this.plan()?.planning_days.map(d => d.day_number) ?? [], this.activeDay()),
  );

  /** Exactly one card is open: the one picked by hand, else the first exercise not yet done. */
  readonly openId = computed(() => this.manualOpenId() ?? firstIncompleteId(this.rows()));

  readonly skeletons = [1, 2, 3];
  readonly stars = [1, 2, 3, 4, 5];

  // Plan connect
  connectInput = '';
  readonly connectLoading = signal(false);
  readonly connectError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.drafts.pruneStale();
    if (this.isSelfManagedUser()) {
      this.planningService.loadPlannings();
    }
    await this.loadWorkout();
  }

  setInput(rowIndex: number, change: InputChange): void {
    this.setInputValue(rowIndex, change.roundIndex, change.field, change.value);
  }

  setInputValue(
    rowIndex: number,
    roundIndex: number,
    field: RoundInputField,
    value: number | null,
  ): void {
    this.clock.start();
    this.updateRow(rowIndex, row => {
      const inputs: RoundInput[] = [...row.inputs];
      inputs[roundIndex] = { ...inputs[roundIndex], [field]: value };
      return { ...row, inputs };
    });
  }

  /**
   * Finishes the exercise's current round. Between rounds it starts the exercise's rest timer;
   * once the last round is done the open card moves on to the next unfinished exercise.
   */
  completeSet(rowIndex: number): void {
    const row = this.rows()[rowIndex];
    const round = currentRound(row);
    if (round === -1) return;

    this.clock.start();
    this.updateRow(rowIndex, r => ({ ...r, roundsDone: withRoundDone(r.roundsDone, round, true) }));

    if (isRowCompleted(this.rows()[rowIndex])) {
      this.advanceToCurrentExercise();
    } else if (row.prescribed.rest_time_minutes > 0) {
      this.startTimer(row.prescribed.rest_time_minutes);
    }
  }

  /** Reopens a finished round so it can be edited and completed again. */
  undoRound(rowIndex: number, roundIndex: number): void {
    this.updateRow(rowIndex, r => ({ ...r, roundsDone: withRoundDone(r.roundsDone, roundIndex, false) }));
  }

  openCard(prescribedId: string): void {
    if (this.openId() === prescribedId) return;
    this.manualOpenId.set(prescribedId);
    this.scrollToCard(prescribedId);
  }

  startTimer(restMinutes: number): void {
    this.clock.start();
    this.timerService.start(Math.round(restMinutes * 60));
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
    const planId = this.currentPlanId();
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
            is_completed: row.roundsDone[r - 1] ?? false,
            target_reps: p.target_reps,
            target_rounds: p.rounds,
          });
        }
      } else {
        row.inputs.forEach((inp, idx) => {
          logs.push({
            exercise_id: p.exercise_id,
            round_number: idx + 1,
            weight_used: inp.weight ?? 0,
            reps_performed: inp.reps ?? p.target_reps,
            is_completed: row.roundsDone[idx] ?? false,
            target_reps: p.target_reps,
            target_rounds: p.rounds,
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
      this.sessionContext(),
    );

    this.saving.set(false);

    if (error) {
      this.saveError.set(error);
      return;
    }

    // The workout is saved: its draft must go, or reloading would bring the finished rounds back.
    const key = this.currentDraftKey();
    if (key !== null) this.drafts.clear(key);
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

  /** The single place rows change: every edit is also saved, so progress survives leaving the page. */
  private updateRow(rowIndex: number, change: (row: WorkoutRowState) => WorkoutRowState): void {
    this.rows.update(rows => rows.map((row, index) => (index === rowIndex ? change(row) : row)));
    this.persistDraft();
  }

  /** Snapshot stored with the session: day slot, plus program/phase/week when following one. */
  private sessionContext(): SessionContext {
    const active = this.activeProgram();
    const position = this.programPosition();
    return {
      dayPosition: this.dayPos().position,
      ...(active && position?.phase && {
        userProgramId: active.userProgram.id,
        phaseId: position.phase.id,
        cycleIndex: position.cycleIndex,
      }),
    };
  }

  /** The program the user follows decides the plan and day; without one, the directly assigned plan does. */
  private async resolveSource(userId: string): Promise<{ planId: string | null; position: ProgramPosition | null }> {
    const active = await this.programs.loadActive(userId);
    this.activeProgram.set(active);
    if (active) {
      const position = resolvePosition(active.phases, active.completedWorkouts);
      if (position.phase) return { planId: position.phase.planning_id, position };
      await this.programs.complete(active.userProgram.id);
      this.activeProgram.set(null);
    }
    return { planId: this.assignedPlanId(), position: null };
  }

  private currentDraftKey(): string | null {
    const userId = this.auth.profile()?.id;
    const planId = this.currentPlanId();
    return userId && planId ? draftKey(userId, planId, this.activeDay()) : null;
  }

  private persistDraft(): void {
    const key = this.currentDraftKey();
    if (key === null || this.rows().length === 0) return;
    this.drafts.save(key, toDraft(this.rows(), this.clock.startedAt(), Date.now()));
  }

  /** Lays the saved draft (if any) over freshly loaded rows and resumes the session clock. */
  private restoreDraft(key: string, fresh: WorkoutRowState[]): WorkoutRowState[] {
    const draft = this.drafts.load(key);
    const restored = applyDraft(fresh, draft);
    const applied = restored.some((row, index) => row !== fresh[index]);
    if (draft !== null && draft.startedAt !== null && applied) this.clock.start(draft.startedAt);
    return restored;
  }

  /** Hands the open card back to the current exercise, so finishing one moves on to the next. */
  private advanceToCurrentExercise(): void {
    this.manualOpenId.set(null);
    const currentId = this.openId();
    if (currentId !== null) this.scrollToCard(currentId);
  }

  /** Scrolls a card to the top once the newly opened layout has rendered. */
  private scrollToCard(prescribedId: string): void {
    afterNextRender(() => {
      const card = this.doc.getElementById(exerciseCardDomId(prescribedId));
      const reduceMotion = this.doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
      card?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }, { injector: this.injector });
  }

  private async loadWorkout(): Promise<void> {
    this.loading.set(true);
    this.rows.set([]);
    this.manualOpenId.set(null);
    this.clock.reset();

    const profile = this.auth.profile();
    const { planId, position } = profile
      ? await this.resolveSource(profile.id)
      : { planId: null, position: null };
    this.programPosition.set(position);
    this.currentPlanId.set(planId);
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
    const activeDay = position?.dayNumber ?? this.workoutService.resolveActiveDay(lastSession, availableDays);
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
        return createRow(p, suggestedWeight);
      }),
    );

    const restored = this.restoreDraft(draftKey(profile.id, planId, activeDay), rows);
    this.plan.set(planFull);
    this.activeDay.set(activeDay);
    this.rows.set(restored);
    this.loading.set(false);
  }
}
