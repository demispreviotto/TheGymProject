import { Component, booleanAttribute, computed, inject, input, model, ChangeDetectionStrategy } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import {
  DEFAULT_PANEL_LAYOUT, effectiveLayout, isPanelHidden, panelGridClass, type PanelLayout, type PanelSlot,
} from './snap-panels.layout';

const SEGMENT_BASE = 'flex h-10 min-w-0 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors';
const PANEL_BASE = 'min-h-0 overflow-hidden rounded-xl bg-neutral-950 ring-1 ring-neutral-800 transition-opacity duration-200 motion-reduce:transition-none';

/**
 * Two stacked panels that fill the page height, each scrolling inside itself. A three-way switch
 * snaps between both panels at half height (the default), the first one full, or the second one
 * full. Set `[allowSplit]="false"` for a plain two-way switch that always shows a single panel.
 * Project the content with `first` and `second` attributes:
 *
 *   <app-snap-panels firstLabel="…" secondLabel="…">
 *     <app-a first /> <app-b second />
 *   </app-snap-panels>
 *
 * A hidden panel stays mounted (so its state and loaded data survive) but is made inert.
 */
@Component({
  selector: 'app-snap-panels',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  host: {
    // Below lg: the viewport minus the top bar (3.5rem), the page padding (1rem + 1.5rem), the tab bar
    // (--tabbar-h, set by the shell) and the bottom safe area. From lg: just the page padding.
    class: 'block h-[calc(100dvh_-_6rem_-_var(--tabbar-h,4.75rem)_-_env(safe-area-inset-bottom))] min-h-[26rem] lg:h-[calc(100dvh-3rem)]',
  },
  template: `
    <div class="flex h-full min-h-0 flex-col gap-3">
      <div
        class="grid flex-shrink-0 gap-1 rounded-xl bg-neutral-900 p-1"
        [class]="columnsClass()"
        role="group"
        [attr.aria-label]="'panels.view' | translate"
      >
        @for (option of options(); track option.layout) {
          <button
            type="button"
            (click)="layout.set(option.layout)"
            [attr.aria-pressed]="current() === option.layout"
            [class]="segmentClass(option.layout)"
          >
            <span class="truncate">{{ option.label }}</span>
          </button>
        }
      </div>

      <div
        class="grid min-h-0 flex-1 transition-[grid-template-rows] duration-200 motion-reduce:transition-none"
        [class]="gridClass()"
      >
        <section
          [class]="panelClass('first')"
          [attr.inert]="isHidden('first') ? '' : null"
          [attr.aria-hidden]="isHidden('first') ? 'true' : null"
        >
          <div class="h-full overflow-y-auto overscroll-contain p-3 lg:p-4">
            <ng-content select="[first]" />
          </div>
        </section>

        <section
          [class]="panelClass('second')"
          [attr.inert]="isHidden('second') ? '' : null"
          [attr.aria-hidden]="isHidden('second') ? 'true' : null"
        >
          <div class="h-full overflow-y-auto overscroll-contain p-3 lg:p-4">
            <ng-content select="[second]" />
          </div>
        </section>
      </div>
    </div>
  `,
})
export class SnapPanelsComponent {
  private readonly lang = inject(LanguageService);

  readonly firstLabel = input.required<string>();
  readonly secondLabel = input.required<string>();

  /** Whether the half-and-half view is offered. Without it the switch has two options and one panel shows at a time. */
  readonly allowSplit = input(true, { transform: booleanAttribute });

  /** Chosen layout; two-way bindable, `split` until the user picks another. See `current` for what is shown. */
  readonly layout = model<PanelLayout>(DEFAULT_PANEL_LAYOUT);

  /** The layout on screen: the chosen one, except that `split` becomes the first panel when it is not allowed. */
  readonly current = computed(() => effectiveLayout(this.layout(), this.allowSplit()));

  readonly options = computed<readonly { layout: PanelLayout; label: string }[]>(() => {
    const first = { layout: 'first' as const, label: this.firstLabel() };
    const second = { layout: 'second' as const, label: this.secondLabel() };
    return this.allowSplit()
      ? [first, { layout: 'split' as const, label: this.lang.t('panels.both') }, second]
      : [first, second];
  });

  readonly columnsClass = computed(() => (this.allowSplit() ? 'grid-cols-3' : 'grid-cols-2'));
  readonly gridClass = computed(() => panelGridClass(this.current()));

  isHidden(slot: PanelSlot): boolean {
    return isPanelHidden(this.current(), slot);
  }

  segmentClass(layout: PanelLayout): string {
    return `${SEGMENT_BASE} ${this.current() === layout
      ? 'bg-tenant-primary text-tenant-contrast'
      : 'text-neutral-400 hover:text-neutral-100'}`;
  }

  panelClass(slot: PanelSlot): string {
    return this.isHidden(slot) ? `${PANEL_BASE} pointer-events-none opacity-0` : PANEL_BASE;
  }
}
