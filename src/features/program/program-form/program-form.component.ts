import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { PlanningService } from '../../../core/planning/planning.service';
import { ProgramService } from '../../../core/program/program.service';
import { clampWeeks, movePhase, newPhase, totalWeeks } from '../../../core/program/program-draft';
import type { PhaseDraft } from '../../../core/program/program.types';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';

/** Create or edit a program: a name and an ordered list of phases (a plan repeated for N weeks). */
@Component({
  selector: 'app-program-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe, AppIconComponent],
  template: `
    <div class="max-w-2xl space-y-5">
      <button (click)="back()" class="text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
        ← {{ 'program.title' | translate }}
      </button>

      <h1 class="text-xl font-semibold">{{ 'program.edit.title' | translate }}</h1>

      <div class="space-y-1">
        <label class="text-xs text-neutral-500" for="program-name">{{ 'program.name' | translate }}</label>
        <input
          id="program-name"
          [ngModel]="title()"
          (ngModelChange)="title.set($event)"
          maxlength="120"
          class="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100
                 focus:outline-none focus:border-neutral-500"
        />
      </div>

      <div class="space-y-2">
        <div>
          <h2 class="text-sm font-medium text-neutral-200">{{ 'program.phases' | translate }}</h2>
          <p class="text-xs text-neutral-500 mt-0.5">{{ 'program.phases.hint' | translate }}</p>
        </div>

        @for (phase of phases(); track $index; let i = $index; let first = $first; let last = $last) {
          <div class="bg-neutral-900 border border-neutral-800 rounded-md p-3 space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-xs text-neutral-500 font-mono">#{{ i + 1 }}</span>
              <div class="ml-auto flex items-center gap-1">
                <button type="button" [disabled]="first" (click)="move(i, -1)"
                  [attr.aria-label]="'program.phase.up' | translate"
                  class="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-100 disabled:opacity-30">↑</button>
                <button type="button" [disabled]="last" (click)="move(i, 1)"
                  [attr.aria-label]="'program.phase.down' | translate"
                  class="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-100 disabled:opacity-30">↓</button>
                <button type="button" (click)="removePhase(i)"
                  [attr.aria-label]="'program.phase.remove' | translate"
                  class="px-1 text-neutral-600 hover:text-red-400 transition-colors">
                  <app-icon name="x-mark" />
                </button>
              </div>
            </div>

            <div class="grid grid-cols-[1fr_6rem] gap-3">
              <div class="space-y-1">
                <label class="text-xs text-neutral-500">{{ 'program.phase.plan' | translate }}</label>
                <select
                  [ngModel]="phase.planning_id"
                  (ngModelChange)="setPlan(i, $event)"
                  class="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100
                         focus:outline-none focus:border-neutral-500"
                >
                  @for (plan of ownPlans(); track plan.id) {
                    <option [value]="plan.id">{{ plan.title }}</option>
                  }
                </select>
              </div>
              <div class="space-y-1">
                <label class="text-xs text-neutral-500">{{ 'program.phase.weeks' | translate }}</label>
                <input
                  type="number" inputmode="numeric" min="1" max="52"
                  [ngModel]="phase.repeat_count"
                  (ngModelChange)="setWeeks(i, $event)"
                  class="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100
                         focus:outline-none focus:border-neutral-500"
                />
              </div>
            </div>
          </div>
        }

        <button type="button" (click)="addPhase()" [disabled]="ownPlans().length === 0"
          class="w-full py-2 rounded-md border border-dashed border-neutral-700 text-sm text-neutral-400
                 hover:text-neutral-100 hover:border-neutral-500 transition-colors disabled:opacity-40">
          {{ 'program.phase.add' | translate }}
        </button>

        @if (phases().length > 0) {
          <p class="text-xs text-neutral-500">{{ weeks() }} {{ 'program.weeks' | translate }}</p>
        }
      </div>

      @if (errorKey()) {
        <p class="text-sm text-red-400" role="alert">{{ errorKey()! | translate }}</p>
      } @else if (saveError()) {
        <p class="text-sm text-red-400" role="alert">{{ saveError() }}</p>
      }

      <div class="flex gap-2">
        <button type="button" (click)="save()" [disabled]="saving()"
          class="px-4 py-2 rounded-md bg-neutral-100 text-neutral-950 text-sm font-medium hover:bg-white
                 transition-colors disabled:opacity-60">
          {{ (saving() ? 'common.saving' : 'common.save') | translate }}
        </button>
        <button type="button" (click)="back()"
          class="px-4 py-2 rounded-md text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
          {{ 'common.cancel' | translate }}
        </button>
      </div>
    </div>
  `,
})
export class ProgramFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly planning = inject(PlanningService);
  private readonly service = inject(ProgramService);

  readonly title = signal('');
  readonly phases = signal<PhaseDraft[]>([]);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly submitted = signal(false);

  private readonly programId = this.route.snapshot.paramMap.get('id');

  /** Phases may only chain plans the user owns (the same rule the database enforces). */
  readonly ownPlans = computed(() =>
    this.planning.plannings().filter(p => p.tenant_id === this.auth.profile()?.id),
  );
  readonly weeks = computed(() => totalWeeks(this.phases()));

  /** Validation message key, shown once the user tried to save. */
  readonly errorKey = computed(() => {
    if (!this.submitted()) return null;
    if (this.title().trim() === '') return 'program.err.name';
    if (this.phases().length === 0) return 'program.err.phases';
    return null;
  });

  async ngOnInit(): Promise<void> {
    await this.planning.loadPlannings();
    if (this.programId === null) return;
    const loaded = await this.service.loadOne(this.programId);
    if (!loaded) return this.back();
    this.title.set(loaded.program.title);
    this.phases.set(loaded.phases.map(p => ({ planning_id: p.planning_id, repeat_count: p.repeat_count })));
  }

  addPhase(): void {
    const first = this.ownPlans()[0];
    if (first) this.phases.update(list => [...list, newPhase(first.id)]);
  }

  removePhase(index: number): void {
    this.phases.update(list => list.filter((_, i) => i !== index));
  }

  move(index: number, direction: -1 | 1): void {
    this.phases.update(list => movePhase(list, index, direction));
  }

  setPlan(index: number, planningId: string): void {
    this.phases.update(list => list.map((p, i) => (i === index ? { ...p, planning_id: planningId } : p)));
  }

  setWeeks(index: number, value: number): void {
    this.phases.update(list => list.map((p, i) => (i === index ? { ...p, repeat_count: clampWeeks(value) } : p)));
  }

  async save(): Promise<void> {
    this.submitted.set(true);
    const userId = this.auth.profile()?.id;
    if (this.errorKey() !== null || !userId) return;

    this.saving.set(true);
    this.saveError.set(null);
    const title = this.title().trim();
    const error = this.programId === null
      ? await this.service.create(userId, title, this.phases())
      : await this.service.update(this.programId, title, this.phases());
    this.saving.set(false);

    if (error) this.saveError.set(error);
    else this.back();
  }

  back(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
