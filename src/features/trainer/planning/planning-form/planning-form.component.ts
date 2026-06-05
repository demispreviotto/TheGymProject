import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  PlanningService,
  PlanningDayPayload,
  PrescribedExercisePayload,
} from '../../../../core/planning/planning.service';
import { ExerciseService } from '../../../../core/exercises/exercise.service';
import { AppIconComponent } from '../../../../shared/ui/icons/app-icon.component';
import type { ExigenceLevel, TrackingMode } from '../../../../core/planning/planning.types';
import type { Profile } from '../../../../core/auth/auth.types';

interface PrescribedRow extends PrescribedExercisePayload {
  _uid: number;
}

interface DayForm {
  day_number: number;
  label: string;
  open: boolean;
  exercises: PrescribedRow[];
}

let _uid = 0;
const nextUid = () => ++_uid;

const EXIGENCE_COLORS: Record<ExigenceLevel, string> = {
  A: 'text-red-400',
  B: 'text-orange-400',
  C: 'text-yellow-400',
  D: 'text-sky-300',
};

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function emptyRow(): PrescribedRow {
  return {
    _uid: nextUid(),
    exercise_id: '',
    exigence: 'A',
    rest_time_minutes: 2,
    tracking_mode: 'standard',
    rounds: 3,
    target_reps: 10,
    suggested_first_weight: null,
    sorting_order: 0,
  };
}

function emptyDays(): DayForm[] {
  return DAY_LABELS.map((label, i) => ({
    day_number: i + 1,
    label,
    open: i === 0,
    exercises: [],
  }));
}

@Component({
  selector: 'app-planning-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgClass, CdkDropList, CdkDrag, AppIconComponent],
  template: `
    <div class="max-w-4xl space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold">{{ isEdit() ? 'Edit Plan' : 'New Training Plan' }}</h1>
        <button type="button" (click)="cancel()"
          class="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
          ← Back
        </button>
      </div>

      <form (ngSubmit)="submit()" class="space-y-6">

        <!-- Meta -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5 col-span-2 md:col-span-1">
            <label class="text-sm font-medium text-neutral-300">Plan Title *</label>
            <input [(ngModel)]="title" name="title" required placeholder="e.g. Hypertrophy Block A"
              class="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm
                     text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500" />
          </div>

          <div class="flex items-end gap-3 col-span-2 md:col-span-1">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" [(ngModel)]="useAutoRm" name="useAutoRm"
                class="w-4 h-4 rounded accent-neutral-100" />
              <span class="text-sm text-neutral-300">Auto 1RM (Epley formula)</span>
            </label>
          </div>
        </div>

        <!-- Day accordion -->
        <div class="space-y-2">
          <h2 class="text-sm font-semibold text-neutral-300">Weekly Structure</h2>

          @for (day of days(); track day.day_number) {
            <div class="border border-neutral-800 rounded-lg overflow-hidden">

              <!-- Day header -->
              <button type="button" (click)="toggleDay(day)"
                class="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-900 transition-colors">
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium text-neutral-200">
                    Day {{ day.day_number }} — {{ day.label }}
                  </span>
                  @if (day.exercises.length > 0) {
                    <span class="text-xs text-neutral-500">{{ day.exercises.length }} exercise{{ day.exercises.length > 1 ? 's' : '' }}</span>
                  }
                </div>
                <app-icon name="chevron-down"
                  [iconClass]="'w-4 h-4 text-neutral-500 transition-transform' + (day.open ? ' rotate-180' : '')" />
              </button>

              @if (day.open) {
                <div class="border-t border-neutral-800 p-4 space-y-3">

                  <!-- Exercise rows (draggable) -->
                  <div
                    cdkDropList
                    [cdkDropListData]="day.exercises"
                    (cdkDropListDropped)="onRowDrop($event, day)"
                    class="space-y-2"
                  >
                    @for (row of day.exercises; track row._uid; let ri = $index) {
                      <div cdkDrag
                        class="bg-neutral-950 border border-neutral-800 rounded-md p-3 space-y-3">

                        <!-- Row header -->
                        <div class="flex items-center gap-2">
                          <app-icon cdkDragHandle name="drag-handle"
                            iconClass="w-4 h-4 text-neutral-700 cursor-grab active:cursor-grabbing flex-shrink-0" />
                          <span class="text-xs text-neutral-500 font-mono">
                            #{{ ri + 1 }}
                          </span>
                          <button type="button" (click)="removeRow(day, ri)"
                            class="ml-auto text-neutral-600 hover:text-red-400 transition-colors">
                            <app-icon name="x-mark" />
                          </button>
                        </div>

                        <!-- Exercise select -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div class="space-y-1">
                            <label class="text-xs text-neutral-500">Exercise *</label>
                            <select [(ngModel)]="row.exercise_id" [name]="'ex_' + row._uid"
                              class="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm
                                     text-neutral-100 focus:outline-none focus:border-neutral-500">
                              <option value="" disabled>Select exercise…</option>
                              @for (ex of exerciseService.exercises(); track ex.id) {
                                <option [value]="ex.id">{{ ex.name }}</option>
                              }
                            </select>
                          </div>

                          <div class="space-y-1">
                            <label class="text-xs text-neutral-500">Tracking Mode</label>
                            <select [(ngModel)]="row.tracking_mode" [name]="'mode_' + row._uid"
                              class="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm
                                     text-neutral-100 focus:outline-none focus:border-neutral-500">
                              <option value="standard">Standard</option>
                              <option value="granular">Granular</option>
                              <option value="failure">Failure</option>
                            </select>
                          </div>
                        </div>

                        <!-- Numeric fields -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div class="space-y-1">
                            <label class="text-xs text-neutral-500">Exigence</label>
                            <select [(ngModel)]="row.exigence" [name]="'exq_' + row._uid"
                              class="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm
                                     focus:outline-none focus:border-neutral-500"
                              [ngClass]="exigenceColor(row.exigence)">
                              <option value="A">A — Max</option>
                              <option value="B">B — High</option>
                              <option value="C">C — Med</option>
                              <option value="D">D — Low</option>
                            </select>
                          </div>

                          <div class="space-y-1">
                            <label class="text-xs text-neutral-500">Rounds</label>
                            <input type="number" [(ngModel)]="row.rounds" [name]="'rounds_' + row._uid"
                              min="1" max="20"
                              class="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm
                                     text-neutral-100 focus:outline-none focus:border-neutral-500" />
                          </div>

                          <div class="space-y-1">
                            <label class="text-xs text-neutral-500">Target Reps</label>
                            <input type="number" [(ngModel)]="row.target_reps" [name]="'reps_' + row._uid"
                              min="1" max="100"
                              class="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm
                                     text-neutral-100 focus:outline-none focus:border-neutral-500" />
                          </div>

                          <div class="space-y-1">
                            <label class="text-xs text-neutral-500">Rest (min)</label>
                            <input type="number" [(ngModel)]="row.rest_time_minutes" [name]="'rest_' + row._uid"
                              min="0" max="10" step="0.5"
                              class="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm
                                     text-neutral-100 focus:outline-none focus:border-neutral-500" />
                          </div>
                        </div>

                        <!-- Suggested weight (shown only when auto 1RM is off) -->
                        @if (!useAutoRm) {
                          <div class="space-y-1 max-w-36">
                            <label class="text-xs text-neutral-500">Suggested Weight (kg)</label>
                            <input type="number" [(ngModel)]="row.suggested_first_weight"
                              [name]="'weight_' + row._uid"
                              min="0" step="0.5" placeholder="Optional"
                              class="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm
                                     text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500" />
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <button type="button" (click)="addRow(day)"
                    class="w-full py-2 border border-dashed border-neutral-700 rounded-md text-sm
                           text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 transition-colors">
                    + Add Exercise
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- User assignment -->
        @if (service.tenantUsers().length > 0) {
          <div class="space-y-3">
            <h2 class="text-sm font-semibold text-neutral-300">Assign to Clients</h2>
            <div class="rounded-lg border border-neutral-800 overflow-hidden">
              @for (user of service.tenantUsers(); track user.id) {
                <div class="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 last:border-0">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-neutral-100">{{ user.name }}</p>
                    <p class="text-xs text-neutral-500">{{ user.email }}</p>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer text-sm text-neutral-400">
                    <input
                      type="checkbox"
                      [checked]="isAssigned(user)"
                      (change)="toggleAssignment(user, $event)"
                      class="w-4 h-4 rounded accent-neutral-100"
                    />
                    Assigned
                  </label>
                </div>
              }
            </div>
          </div>
        }

        @if (error()) {
          <p class="text-sm text-red-400">{{ error() }}</p>
        }

        <div class="flex gap-3 pt-2">
          <button type="submit"
            [disabled]="submitting() || !title().trim()"
            class="px-4 py-2 rounded-md bg-neutral-100 text-neutral-950 text-sm font-medium
                   hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {{ submitting() ? 'Saving…' : (isEdit() ? 'Save Changes' : 'Create Plan') }}
          </button>
          <button type="button" (click)="cancel()"
            class="px-4 py-2 rounded-md border border-neutral-700 text-sm text-neutral-300
                   hover:bg-neutral-800 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `,
})
export class PlanningFormComponent implements OnInit {
  readonly service = inject(PlanningService);
  readonly exerciseService = inject(ExerciseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly title = signal('');
  readonly useAutoRm = signal(false);
  readonly days = signal<DayForm[]>(emptyDays());
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  private editId = signal<string | null>(null);
  private pendingAssignments = signal<Map<string, string | null>>(new Map());

  readonly isEdit = computed(() => !!this.editId());

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.exerciseService.load(),
      this.service.loadTenantUsers(),
    ]);

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.editId.set(id);

    const full = await this.service.loadFull(id);
    if (!full) return;

    this.title.set(full.title);
    this.useAutoRm.set(full.use_auto_1rm);

    const loaded = emptyDays();
    for (const day of full.planning_days) {
      const slot = loaded.find(d => d.day_number === day.day_number);
      if (!slot) continue;
      slot.open = true;
      slot.exercises = day.prescribed_exercises
        .sort((a, b) => a.sorting_order - b.sorting_order)
        .map(pe => ({
          _uid: nextUid(),
          exercise_id: pe.exercise_id,
          exigence: pe.exigence,
          rest_time_minutes: pe.rest_time_minutes,
          tracking_mode: pe.tracking_mode,
          rounds: pe.rounds,
          target_reps: pe.target_reps,
          suggested_first_weight: pe.suggested_first_weight,
          sorting_order: pe.sorting_order,
        }));
    }
    this.days.set(loaded);
  }

  toggleDay(day: DayForm): void {
    this.days.update(ds =>
      ds.map(d => d.day_number === day.day_number ? { ...d, open: !d.open } : d)
    );
  }

  addRow(day: DayForm): void {
    this.days.update(ds =>
      ds.map(d =>
        d.day_number === day.day_number
          ? { ...d, exercises: [...d.exercises, emptyRow()] }
          : d
      )
    );
  }

  removeRow(day: DayForm, index: number): void {
    this.days.update(ds =>
      ds.map(d =>
        d.day_number === day.day_number
          ? { ...d, exercises: d.exercises.filter((_, i) => i !== index) }
          : d
      )
    );
  }

  onRowDrop(event: CdkDragDrop<PrescribedRow[]>, day: DayForm): void {
    this.days.update(ds =>
      ds.map(d => {
        if (d.day_number !== day.day_number) return d;
        const updated = [...d.exercises];
        moveItemInArray(updated, event.previousIndex, event.currentIndex);
        return { ...d, exercises: updated };
      })
    );
  }

  exigenceColor(level: ExigenceLevel): string {
    return EXIGENCE_COLORS[level];
  }

  isAssigned(user: Profile): boolean {
    const pending = this.pendingAssignments();
    if (pending.has(user.id)) return pending.get(user.id) === this.editId();
    return user.assigned_planning_id === this.editId();
  }

  toggleAssignment(user: Profile, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.pendingAssignments.update(map => {
      const next = new Map(map);
      next.set(user.id, checked ? (this.editId() ?? '__new__') : null);
      return next;
    });
  }

  async submit(): Promise<void> {
    if (!this.title().trim()) return;
    this.submitting.set(true);
    this.error.set(null);

    const payload = {
      title: this.title().trim(),
      use_auto_1rm: this.useAutoRm(),
      days: this.days().map(d => ({
        day_number: d.day_number,
        exercises: d.exercises.map((e, i) => ({
          exercise_id: e.exercise_id,
          exigence: e.exigence,
          rest_time_minutes: e.rest_time_minutes,
          tracking_mode: e.tracking_mode,
          rounds: e.rounds,
          target_reps: e.target_reps,
          suggested_first_weight: e.suggested_first_weight,
          sorting_order: i,
        })),
      })) as PlanningDayPayload[],
    };

    const id = this.editId();
    let err = id
      ? await this.service.update(id, payload)
      : await this.service.create(payload);

    if (err) { this.error.set(err); this.submitting.set(false); return; }

    // Flush pending user assignments (use the created ID for new plans)
    const resolvedId = id ?? this.service.plannings()[0]?.id;
    for (const [userId, planId] of this.pendingAssignments()) {
      const assignId = planId === '__new__' ? resolvedId : planId;
      const assignErr = await this.service.assignPlanning(userId, assignId ?? null);
      if (assignErr) { this.error.set(assignErr); this.submitting.set(false); return; }
    }

    this.submitting.set(false);
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  cancel(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
