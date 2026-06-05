import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray } from '@angular/cdk/drag-drop';
import { AppIconComponent } from '../../../../shared/ui/icons/app-icon.component';
import type { MuscleGroup, MuscleIntensity } from '../../../../core/planning/planning.types';

const INTENSITY_LABELS: Record<MuscleIntensity, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
};

const INTENSITY_COLORS: Record<MuscleIntensity, string> = {
  primary: 'bg-red-900 text-red-300 border-red-700',
  secondary: 'bg-orange-900 text-orange-300 border-orange-700',
  tertiary: 'bg-neutral-800 text-neutral-400 border-neutral-600',
};

function indexToIntensity(i: number): MuscleIntensity {
  if (i === 0) return 'primary';
  if (i === 1) return 'secondary';
  return 'tertiary';
}

@Component({
  selector: 'app-muscle-tag-matrix',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CdkDropList, CdkDrag, AppIconComponent],
  template: `
    <div class="space-y-3">
      <label class="text-sm font-medium text-neutral-300">Muscle Groups</label>

      <!-- Drag-and-drop list -->
      <div
        cdkDropList
        (cdkDropListDropped)="onDrop($event)"
        class="space-y-2 min-h-8"
      >
        @for (group of tagged(); track group.name; let i = $index) {
          <div
            cdkDrag
            class="flex items-center gap-2 px-3 py-2 rounded-md border cursor-grab active:cursor-grabbing
                   bg-neutral-900 border-neutral-700 select-none"
          >
            <!-- Drag handle -->
            <app-icon cdkDragHandle name="drag-handle" iconClass="w-4 h-4 text-neutral-600 flex-shrink-0" />

            <span class="flex-1 text-sm text-neutral-100">{{ group.name }}</span>

            <span class="text-xs px-2 py-0.5 rounded border {{ intensityColor(group.intensity) }}">
              {{ intensityLabel(group.intensity) }}
            </span>

            <button
              type="button"
              (click)="remove(i)"
              class="text-neutral-600 hover:text-red-400 transition-colors ml-1"
            >
              <app-icon name="x-mark" />
            </button>
          </div>
        }
      </div>

      <!-- Add muscle input -->
      <div class="flex gap-2">
        <input
          [(ngModel)]="newMuscle"
          (keydown.enter)="add()"
          placeholder="e.g. Quadriceps"
          class="flex-1 bg-neutral-900 border border-neutral-700 rounded-md px-3 py-1.5 text-sm
                 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
        />
        <button
          type="button"
          (click)="add()"
          class="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-sm
                 text-neutral-200 transition-colors border border-neutral-700"
        >
          Add
        </button>
      </div>

      @if (tagged().length === 0) {
        <p class="text-xs text-neutral-600">No muscles tagged. Add one above.</p>
      }
    </div>
  `,
})
export class MuscleTagMatrixComponent {
  readonly value = input<MuscleGroup[]>([]);
  readonly changed = output<MuscleGroup[]>();

  readonly newMuscle = signal('');

  readonly tagged = computed<MuscleGroup[]>(() =>
    this.value().map((g, i) => ({ name: g.name, intensity: indexToIntensity(i) }))
  );

  intensityLabel(i: MuscleIntensity): string { return INTENSITY_LABELS[i]; }
  intensityColor(i: MuscleIntensity): string { return INTENSITY_COLORS[i]; }

  onDrop(event: CdkDragDrop<MuscleGroup[]>): void {
    const updated = [...this.value()];
    moveItemInArray(updated, event.previousIndex, event.currentIndex);
    this.emit(updated);
  }

  add(): void {
    const name = this.newMuscle().trim();
    if (!name) return;
    const updated = [...this.value(), { name, intensity: indexToIntensity(this.value().length) }];
    this.emit(updated);
    this.newMuscle.set('');
  }

  remove(index: number): void {
    const updated = this.value().filter((_, i) => i !== index);
    this.emit(updated);
  }

  private emit(groups: MuscleGroup[]): void {
    const reindexed = groups.map((g, i) => ({ name: g.name, intensity: indexToIntensity(i) }));
    this.changed.emit(reindexed);
  }
}
