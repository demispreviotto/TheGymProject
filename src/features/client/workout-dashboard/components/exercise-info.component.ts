import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { MuscleChipsComponent } from '../../../../shared/components/muscle-chips/muscle-chips.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../../shared/ui/icons/app-icon.component';
import type { Exercise } from '../../../../core/planning/planning.types';

/**
 * Full-screen overlay (same look as the rest timer's) with what a user may want to know about an
 * exercise mid-workout: its name, the definition and recommendations as text, and the muscles it
 * targets as chips under them. Open while an exercise is set; `closed` asks the parent to clear it.
 * Closes from the X, a tap outside the card, or Escape.
 */
@Component({
  selector: 'app-exercise-info',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIconComponent, MuscleChipsComponent, TranslatePipe],
  host: { '(document:keydown.escape)': 'onEscape()' },
  template: `
    @if (exercise(); as ex) {
      <div
        class="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950/90 px-4 backdrop-blur-sm"
        (click)="closed.emit()"
      >
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="ex.name"
          class="flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-xl"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-lg font-semibold leading-tight text-neutral-100">{{ ex.name }}</h2>
            <button
              type="button"
              (click)="closed.emit()"
              [attr.aria-label]="'common.close' | translate"
              class="-mr-2 -mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
            >
              <app-icon name="x-mark" iconClass="w-5 h-5 fill-current" />
            </button>
          </div>

          <div class="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain">
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
        </div>
      </div>
    }
  `,
})
export class ExerciseInfoComponent {
  readonly exercise = input<Exercise | null>(null);
  readonly closed = output<void>();

  readonly hasText = computed(() => {
    const ex = this.exercise();
    return Boolean(ex?.definition?.trim() || ex?.recommendations?.trim());
  });

  onEscape(): void {
    if (this.exercise() !== null) this.closed.emit();
  }
}
