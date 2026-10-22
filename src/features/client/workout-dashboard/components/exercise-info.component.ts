import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { MuscleChipsComponent } from '../../../../shared/components/muscle-chips/muscle-chips.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { HlmSheetComponent } from '../../../../shared/ui/sheet/hlm-sheet.component';
import type { Exercise } from '../../../../core/planning/planning.types';

/**
 * Overlay with what a user may want to know about an exercise mid-workout: its name, the definition
 * and recommendations as text, and the muscles it targets as chips under them. Open while an
 * exercise is set; `closed` asks the parent to clear it.
 */
@Component({
  selector: 'app-exercise-info',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSheetComponent, MuscleChipsComponent, TranslatePipe],
  template: `
    <hlm-sheet [open]="exercise() !== null" [title]="exercise()?.name ?? ''" side="bottom" (closed)="closed.emit()">
      @if (exercise(); as ex) {
        <div class="space-y-5 pb-2">
          @if (hasText()) {
            @if (ex.definition) {
              <section class="space-y-1">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {{ 'exercise.definition' | translate }}
                </h3>
                <p class="whitespace-pre-line text-sm leading-relaxed text-neutral-200">{{ ex.definition }}</p>
              </section>
            }
            @if (ex.recommendations) {
              <section class="space-y-1">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {{ 'exercise.recommendations' | translate }}
                </h3>
                <p class="whitespace-pre-line text-sm leading-relaxed text-neutral-200">{{ ex.recommendations }}</p>
              </section>
            }
          } @else {
            <p class="text-sm text-neutral-500">{{ 'exercise.info.empty' | translate }}</p>
          }

          <app-muscle-chips [muscles]="ex.muscle_groups" />
        </div>
      }
    </hlm-sheet>
  `,
})
export class ExerciseInfoComponent {
  readonly exercise = input<Exercise | null>(null);
  readonly closed = output<void>();

  readonly hasText = computed(() => {
    const ex = this.exercise();
    return Boolean(ex?.definition?.trim() || ex?.recommendations?.trim());
  });
}
