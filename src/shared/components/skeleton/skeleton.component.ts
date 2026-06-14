import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      @for (_ of items(); track $index) {
        <div [class]="'rounded-lg bg-neutral-800 animate-pulse ' + itemClass()"></div>
      }
    </div>
  `,
})
export class SkeletonComponent {
  readonly count = input<number>(3);
  readonly itemClass = input<string>('h-14');
  readonly items = computed(() => Array.from({ length: this.count() }));
}
