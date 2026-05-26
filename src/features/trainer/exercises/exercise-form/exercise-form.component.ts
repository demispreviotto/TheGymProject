import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExerciseService, ExercisePayload } from '../../../../core/exercises/exercise.service';
import { MuscleTagMatrixComponent } from '../muscle-tag-matrix/muscle-tag-matrix.component';
import type { MuscleGroup } from '../../../../core/planning/planning.types';

@Component({
  selector: 'app-exercise-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MuscleTagMatrixComponent],
  template: `
    <div class="max-w-2xl">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-semibold">{{ isEdit() ? 'Edit Exercise' : 'New Exercise' }}</h1>
        <button
          type="button"
          (click)="cancel()"
          class="text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
        >
          ← Back
        </button>
      </div>

      <form (ngSubmit)="submit()" class="space-y-5">

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-neutral-300">Name *</label>
          <input
            [(ngModel)]="name"
            name="name"
            required
            placeholder="Exercise name"
            class="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm
                   text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-neutral-300">Definition</label>
          <textarea
            [(ngModel)]="definition"
            name="definition"
            rows="3"
            placeholder="How this exercise is performed..."
            class="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm
                   text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
          ></textarea>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-neutral-300">Recommendations</label>
          <textarea
            [(ngModel)]="recommendations"
            name="recommendations"
            rows="3"
            placeholder="Coaching cues, tips..."
            class="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm
                   text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
          ></textarea>
        </div>

        <app-muscle-tag-matrix
          [value]="muscleGroups()"
          (changed)="muscleGroups.set($event)"
        />

        @if (error()) {
          <p class="text-sm text-red-400">{{ error() }}</p>
        }

        <div class="flex gap-3 pt-2">
          <button
            type="submit"
            [disabled]="submitting() || !name().trim()"
            class="px-4 py-2 rounded-md bg-neutral-100 text-neutral-950 text-sm font-medium
                   hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ submitting() ? 'Saving…' : (isEdit() ? 'Save Changes' : 'Create Exercise') }}
          </button>
          <button
            type="button"
            (click)="cancel()"
            class="px-4 py-2 rounded-md border border-neutral-700 text-sm text-neutral-300
                   hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ExerciseFormComponent implements OnInit {
  private readonly service = inject(ExerciseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly name = signal('');
  readonly definition = signal('');
  readonly recommendations = signal('');
  readonly muscleGroups = signal<MuscleGroup[]>([]);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  private editId = signal<string | null>(null);
  readonly isEdit = computed(() => !!this.editId());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.editId.set(id);

    const existing = this.service.exercises().find(e => e.id === id);
    if (existing) {
      this.name.set(existing.name);
      this.definition.set(existing.definition ?? '');
      this.recommendations.set(existing.recommendations ?? '');
      this.muscleGroups.set(existing.muscle_groups);
    }
  }

  async submit(): Promise<void> {
    if (!this.name().trim()) return;
    this.submitting.set(true);
    this.error.set(null);

    const payload: ExercisePayload = {
      name: this.name().trim(),
      definition: this.definition().trim() || null,
      recommendations: this.recommendations().trim() || null,
      muscle_groups: this.muscleGroups(),
    };

    const id = this.editId();
    const err = id
      ? await this.service.update(id, payload)
      : await this.service.create(payload);

    this.submitting.set(false);
    if (err) { this.error.set(err); return; }
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  cancel(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
