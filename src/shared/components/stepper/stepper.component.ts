import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { AppIconComponent } from '../../ui/icons/app-icon.component';
import { nextStepValue } from '../../utils/number-step';

/**
 * − / value / + control with 48px touch targets. The centre is a real number input,
 * so exact values can still be typed. Emits `null` when the field is cleared.
 */
@Component({
  selector: 'app-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIconComponent],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-1.5 rounded-lg bg-neutral-900 p-2" [class.opacity-40]="disabled()">
      <span class="truncate text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {{ label() }}
      </span>

      <input
        type="number"
        inputmode="decimal"
        [attr.min]="min()"
        [step]="step()"
        [value]="value() ?? ''"
        [attr.placeholder]="placeholder() ?? 0"
        [disabled]="disabled()"
        [attr.aria-label]="label()"
        (input)="onInput($event)"
        class="w-full min-w-0 bg-transparent py-1 text-center text-2xl font-bold tabular-nums text-neutral-100 placeholder-neutral-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <div class="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          (click)="nudge(-1)"
          [disabled]="disabled()"
          [attr.aria-label]="'− ' + label()"
          class="flex h-12 items-center justify-center rounded-lg bg-neutral-800 text-neutral-100 transition-transform hover:bg-neutral-700 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <app-icon name="minus" iconClass="w-5 h-5 fill-current" />
        </button>
        <button
          type="button"
          (click)="nudge(1)"
          [disabled]="disabled()"
          [attr.aria-label]="'+ ' + label()"
          class="flex h-12 items-center justify-center rounded-lg bg-neutral-800 text-neutral-100 transition-transform hover:bg-neutral-700 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <app-icon name="plus" iconClass="w-5 h-5 fill-current" />
        </button>
      </div>
    </div>
  `,
})
export class StepperComponent {
  readonly value = input.required<number | null>();
  readonly label = input.required<string>();
  readonly step = input(1);
  readonly min = input(0);
  /** Greyed-out value shown while empty; also the starting point of the first ± tap. */
  readonly placeholder = input<number | null>(null);
  readonly disabled = input(false);

  readonly valueChange = output<number | null>();

  nudge(direction: 1 | -1): void {
    this.valueChange.emit(
      nextStepValue(this.value(), this.placeholder(), this.step(), this.min(), direction),
    );
  }

  onInput(event: Event): void {
    const parsed = parseFloat((event.target as HTMLInputElement).value);
    this.valueChange.emit(Number.isNaN(parsed) ? null : parsed);
  }
}
