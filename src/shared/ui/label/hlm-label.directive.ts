import { computed, Directive, input } from '@angular/core';

@Directive({
  selector: '[hlmLabel]',
  standalone: true,
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmLabelDirective {
  readonly userClass = input<string>('', { alias: 'class' });

  protected _computedClass = computed(
    () =>
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ' +
      this.userClass(),
  );
}
