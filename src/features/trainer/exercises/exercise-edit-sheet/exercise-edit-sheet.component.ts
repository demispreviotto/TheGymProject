import {
  Component,
  input,
  output,
  signal,
  computed,
  OnChanges,
  SimpleChanges,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExerciseService, ExercisePayload } from '../../../../core/exercises/exercise.service';
import { MuscleTagMatrixComponent } from '../muscle-tag-matrix/muscle-tag-matrix.component';
import { HlmSheetComponent } from '../../../../shared/ui/sheet/hlm-sheet.component';
import { AppIconComponent } from '../../../../shared/ui/icons/app-icon.component';
import type { Exercise, MuscleGroup } from '../../../../core/planning/planning.types';

@Component({
  selector: 'app-exercise-edit-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MuscleTagMatrixComponent, HlmSheetComponent, AppIconComponent],
  template: `
    <hlm-sheet [open]="!!exercise()" [title]="exercise()?.name ?? ''" (closed)="onClose()">
      @if (exercise(); as ex) {
        <div class="space-y-5">

          @if (isGlobal()) {
            <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700">
              <app-icon name="lock-closed" iconClass="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <span class="text-xs text-neutral-500">Global exercises are read-only.</span>
            </div>
          } @else if (!unlocked()) {
            <button
              (click)="unlocked.set(true)"
              class="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-neutral-700 text-sm text-neutral-400 hover:border-neutral-500 hover:text-neutral-100 transition-colors"
            >
              <app-icon name="lock-open" />
              Modify Structural Definition
            </button>
          }

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-300">Name</label>
            <input
              type="text"
              [value]="name()"
              (input)="name.set(asString($event))"
              [attr.disabled]="!unlocked() || isGlobal() ? '' : null"
              placeholder="Exercise name"
              class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 disabled:opacity-40"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-300">Definition</label>
            <textarea
              rows="3"
              [value]="definition()"
              (input)="definition.set(asString($event))"
              [attr.disabled]="!unlocked() || isGlobal() ? '' : null"
              placeholder="How this exercise is performed..."
              class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none disabled:opacity-40"
            ></textarea>
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-neutral-300">Recommendations</label>
            <textarea
              rows="3"
              [value]="recommendations()"
              (input)="recommendations.set(asString($event))"
              [attr.disabled]="!unlocked() || isGlobal() ? '' : null"
              placeholder="Coaching cues, tips..."
              class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none disabled:opacity-40"
            ></textarea>
          </div>

          <div [class.pointer-events-none]="!unlocked() || isGlobal()" [class.opacity-40]="!unlocked() || isGlobal()">
            <app-muscle-tag-matrix
              [value]="muscleGroups()"
              (changed)="muscleGroups.set($event)"
            />
          </div>

          @if (error()) {
            <p class="text-sm text-red-400">{{ error() }}</p>
          }

          @if (unlocked() && !isGlobal()) {
            <div class="flex gap-3 pt-2">
              <button
                (click)="submit()"
                [attr.disabled]="submitting() || !name().trim() ? '' : null"
                class="flex-1 py-2 rounded-lg bg-neutral-100 text-neutral-950 text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
              >
                {{ submitting() ? 'Saving…' : 'Save Changes' }}
              </button>
              <button
                type="button"
                (click)="onClose()"
                class="px-4 py-2 rounded-lg border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          }
        </div>
      }
    </hlm-sheet>
  `,
})
export class ExerciseEditSheetComponent implements OnChanges {
  private readonly service = inject(ExerciseService);

  readonly exercise = input<Exercise | null>(null);
  readonly closed = output<void>();

  readonly unlocked = signal(false);
  readonly name = signal('');
  readonly definition = signal('');
  readonly recommendations = signal('');
  readonly muscleGroups = signal<MuscleGroup[]>([]);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly isGlobal = computed(() => this.exercise()?.tenant_id === null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['exercise']) {
      const ex = this.exercise();
      this.unlocked.set(false);
      this.error.set(null);
      this.name.set(ex?.name ?? '');
      this.definition.set(ex?.definition ?? '');
      this.recommendations.set(ex?.recommendations ?? '');
      this.muscleGroups.set(ex?.muscle_groups ?? []);
    }
  }

  asString(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  async submit(): Promise<void> {
    const id = this.exercise()?.id;
    if (!id || !this.name().trim()) return;
    this.submitting.set(true);
    this.error.set(null);

    const payload: ExercisePayload = {
      name: this.name().trim(),
      definition: this.definition().trim() || null,
      recommendations: this.recommendations().trim() || null,
      muscle_groups: this.muscleGroups(),
    };

    const err = await this.service.update(id, payload);
    this.submitting.set(false);
    if (err) { this.error.set(err); return; }
    this.closed.emit();
  }

  onClose(): void {
    this.closed.emit();
  }
}
