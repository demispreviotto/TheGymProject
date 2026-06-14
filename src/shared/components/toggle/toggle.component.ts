import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="active()"
      (click)="changed.emit(!active())"
      [class]="trackClass()"
    >
      <span [class]="thumbClass()"></span>
    </button>
  `,
})
export class ToggleComponent {
  readonly active = input.required<boolean>();
  readonly changed = output<boolean>();

  readonly trackClass = computed(() => {
    const base = 'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none';
    return this.active()
      ? `${base} bg-[hsl(var(--tenant-primary))]`
      : `${base} bg-neutral-700`;
  });

  readonly thumbClass = computed(() => {
    const base = 'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform';
    return this.active() ? `${base} translate-x-4` : `${base} translate-x-1`;
  });
}
