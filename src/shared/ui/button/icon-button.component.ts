import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { AppIconComponent } from '../icons/app-icon.component';
import type { IconName } from '../icons/icon.types';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonVariants = VariantProps<typeof iconButtonVariants>;

/**
 * Button that combines an icon + label with three display modes:
 *
 *   labelMode="always"     → icon + label always visible (default)
 *   labelMode="never"      → icon only (square button, size="icon" recommended)
 *   labelMode="responsive" → icon only on mobile (<sm), icon + label on sm+
 *
 * Usage:
 *   <app-icon-button icon="pencil" label="Edit" labelMode="responsive" variant="ghost" size="sm" />
 *   <app-icon-button icon="trash" label="Delete" labelMode="never" variant="destructive" size="icon" />
 */
@Component({
  selector: 'app-icon-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIconComponent],
  template: `
    <button [class]="_hostClass()" [disabled]="disabled()">
      <app-icon [name]="icon()" [iconClass]="_iconClass()" />
      @if (label()) {
        <span [class]="_labelClass()">{{ label() }}</span>
      }
    </button>
  `,
})
export class IconButtonComponent {
  readonly icon = input.required<IconName>();
  readonly label = input<string>('');
  readonly variant = input<ButtonVariants['variant']>('default');
  readonly size = input<ButtonVariants['size']>('default');
  readonly disabled = input<boolean>(false);
  readonly userClass = input<string>('', { alias: 'class' });

  /**
   * Controls when the text label is visible:
   * - "always"     → always shown
   * - "never"      → hidden (icon-only button)
   * - "responsive" → hidden on mobile, shown on sm+ breakpoint
   */
  readonly labelMode = input<'always' | 'never' | 'responsive'>('always');

  protected _hostClass = computed(() =>
    iconButtonVariants({ variant: this.variant(), size: this.size() }) + ' ' + this.userClass(),
  );

  protected _iconClass = computed(() => {
    const s = this.size();
    return s === 'sm' ? 'w-3.5 h-3.5' : s === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  });

  protected _labelClass = computed(() => {
    switch (this.labelMode()) {
      case 'never':       return 'hidden';
      case 'responsive':  return 'hidden sm:inline';
      default:            return '';
    }
  });
}
