import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import type { MuscleGroup, MuscleIntensity } from '../../../core/planning/planning.types';

const INTENSITY_ORDER: Record<MuscleIntensity, number> = { primary: 0, secondary: 1, tertiary: 2 };

const INTENSITY_CLASSES: Record<MuscleIntensity, string> = {
  primary: 'bg-tenant-primary/15 text-tenant-primary font-semibold',
  secondary: 'bg-neutral-800 text-neutral-300',
  tertiary: 'bg-neutral-800/60 text-neutral-500',
};

const CHIP_BASE = 'rounded-full px-2.5 py-0.5 text-xs';

/** Muscle tags of an exercise, primary first. Wraps instead of overflowing on narrow screens. */
@Component({
  selector: 'app-muscle-chips',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (sorted().length > 0) {
      <div class="flex flex-wrap items-center gap-1.5">
        @for (muscle of sorted(); track $index) {
          <span [class]="chipClass(muscle.intensity)">{{ muscle.name }}</span>
        }
      </div>
    }
  `,
})
export class MuscleChipsComponent {
  readonly muscles = input.required<readonly MuscleGroup[]>();

  readonly sorted = computed(() =>
    [...this.muscles()].sort((a, b) => INTENSITY_ORDER[a.intensity] - INTENSITY_ORDER[b.intensity]),
  );

  chipClass(intensity: MuscleIntensity): string {
    return `${CHIP_BASE} ${INTENSITY_CLASSES[intensity]}`;
  }
}
