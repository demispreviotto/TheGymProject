import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AppIconComponent } from '../icons/app-icon.component';

@Component({
  selector: 'hlm-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIconComponent],
  template: `
    @if (open()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-40 bg-black/60 transition-opacity"
        (click)="closed.emit()"
      ></div>

      <!-- Panel -->
      <div [class]="panelClass()">
        <!-- Close button -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-base font-semibold text-neutral-100">{{ title() }}</h2>
          <button
            (click)="closed.emit()"
            class="p-1 rounded-md text-neutral-400 hover:text-neutral-100 transition-colors"
            aria-label="Close"
          >
            <app-icon name="x-mark" iconClass="w-5 h-5" />
          </button>
        </div>

        <ng-content />
      </div>
    }
  `,
})
export class HlmSheetComponent {
  readonly open = input.required<boolean>();
  readonly title = input('');
  readonly side = input<'right' | 'bottom'>('right');

  readonly closed = output<void>();

  readonly panelClass = computed(() => {
    const base =
      'fixed z-50 bg-neutral-900 border-neutral-800 overflow-y-auto transition-transform duration-200 p-6';
    if (this.side() === 'bottom') {
      return `${base} inset-x-0 bottom-0 border-t rounded-t-2xl max-h-[85vh]`;
    }
    return `${base} inset-y-0 right-0 w-full max-w-md border-l`;
  });
}
