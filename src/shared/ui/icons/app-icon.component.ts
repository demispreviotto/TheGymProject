import { Component, input, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICONS } from './icons.registry';
import type { IconName } from './icon.types';

/**
 * Centralised SVG icon component backed by the icons registry.
 *
 * Usage:
 *   <app-icon name="bolt" />                                    → w-4 h-4 (default)
 *   <app-icon name="bolt" iconClass="w-5 h-5 text-red-400" />
 *
 * Dynamic fill (star rating):
 *   <app-icon name="star"
 *     [iconClass]="active ? 'w-10 h-10 text-yellow-400 fill-yellow-400'
 *                         : 'w-10 h-10 text-neutral-600'" />
 *
 * Spinner:
 *   <app-icon name="spinner" iconClass="animate-spin h-6 w-6 text-neutral-400" />
 *
 * To add icons: update icons.registry.ts only — no changes needed here.
 *
 * Library-ready: copy icons.registry.ts + icon.types.ts + this file into
 * an Angular library. Update the two relative imports below to the library
 * package name. Zero consumer changes required.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [class]="iconClass()"
      fill="currentColor"
      viewBox="0 0 256 256"
      aria-hidden="true"
    >
      <g [innerHTML]="svgContent()"></g>
    </svg>
  `,
})
export class AppIconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  /** Icon identifier — must be a key in the icons registry. */
  readonly name = input.required<IconName>();

  /** Tailwind classes applied to the <svg> element. Controls size, color, fill, and animation. */
  readonly iconClass = input<string>('w-4 h-4');

  /**
   * Resolves the raw inner-SVG string from the registry and marks it trusted.
   * bypassSecurityTrustHtml is appropriate here because registry values are
   * compile-time constants, not user input — equivalent trust to Angular templates.
   */
  readonly svgContent = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()] ?? ''),
  );
}
