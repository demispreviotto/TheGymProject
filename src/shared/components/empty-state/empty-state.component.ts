import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text-center py-16 text-neutral-600">
      <p class="text-sm">{{ message() }}</p>
      @if (hint()) {
        <p class="text-xs mt-1">{{ hint() }}</p>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly message = input.required<string>();
  readonly hint = input<string>();
}
