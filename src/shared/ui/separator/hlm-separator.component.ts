import { Component, computed, input } from '@angular/core';
import { BrnSeparator } from '@spartan-ng/brain/separator';

@Component({
  selector: 'hlm-separator',
  standalone: true,
  imports: [BrnSeparator],
  host: {
    '[class]': '_computedClass()',
  },
  template: `<brn-separator [orientation]="orientation()" [decorative]="decorative()" class="block" />`,
})
export class HlmSeparatorComponent {
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly decorative = input<boolean>(true);
  readonly userClass = input<string>('', { alias: 'class' });

  protected _computedClass = computed(() => {
    const base =
      'block shrink-0 bg-border ' +
      (this.orientation() === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]');
    return base + ' ' + this.userClass();
  });
}
