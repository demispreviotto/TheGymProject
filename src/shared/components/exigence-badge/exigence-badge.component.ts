import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import type { ExigenceLevel } from '../../../core/planning/planning.types';

const LEVEL_CLASSES: Record<ExigenceLevel, string> = {
  A: 'bg-red-950/40 text-red-400',
  B: 'bg-orange-950/40 text-orange-400',
  C: 'bg-amber-950/40 text-amber-400',
  D: 'bg-cyan-950/40 text-cyan-400',
};

const BASE_CLASSES = 'inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider';

/** Pill showing an exercise's exigence level (A–D). Letter + colour, never colour alone. */
@Component({
  selector: 'app-exigence-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="classes()">{{ level() }}</span>`,
})
export class ExigenceBadgeComponent {
  readonly level = input.required<ExigenceLevel>();

  readonly classes = computed(() => `${BASE_CLASSES} ${LEVEL_CLASSES[this.level()]}`);
}
