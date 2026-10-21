import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../../shared/ui/icons/app-icon.component';
import type { SuggestionSource } from '../../../../core/workout/workout-stats';

/**
 * Suggested-weight hint with the brain icon.
 *
 * Self-contained on purpose: to drop the feature, delete this component and the single
 * `<app-suggestion-chip>` usage in ExerciseCardComponent. Nothing else depends on it.
 */
@Component({
  selector: 'app-suggestion-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIconComponent, TranslatePipe],
  host: { class: 'block' },
  template: `
    <div class="flex items-center gap-2 rounded-lg bg-neutral-800/60 px-3 py-2">
      <app-icon name="brain" iconClass="w-[18px] h-[18px] flex-shrink-0 fill-current text-amber-400" />
      <p class="min-w-0 text-xs text-neutral-400">
        <span class="text-neutral-200">{{ 'dashboard.suggested' | translate }}:</span>
        <span class="ml-1 font-semibold tabular-nums text-neutral-100">{{ weight() }} kg</span>
        <span class="ml-1 text-neutral-500">· {{ sourceKey() | translate }}</span>
      </p>
    </div>
  `,
})
export class SuggestionChipComponent {
  readonly weight = input.required<number>();
  readonly source = input<SuggestionSource>('plan');

  readonly sourceKey = computed(() =>
    this.source() === 'auto' ? 'dashboard.suggested.auto' : 'dashboard.suggested.plan',
  );
}
