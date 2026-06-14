import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-semibold text-neutral-100">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="text-sm text-neutral-500 mt-0.5">{{ subtitle() }}</p>
        }
      </div>
      <ng-content />
    </div>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
