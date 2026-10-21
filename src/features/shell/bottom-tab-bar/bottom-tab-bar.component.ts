import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';
import { isNavItemActive, type NavItem } from '../app-shell/nav-items';

const TAB_BASE = 'flex h-full min-h-12 w-full flex-col items-center justify-center gap-1 transition-colors';

/**
 * Mobile-only bottom navigation: one tab per page of the user's role (at most 5, so there is no
 * overflow menu). A floating card (same surface and corners as the page's cards) inset from the
 * screen edges. Hidden from `lg` up, where the sidebar takes over.
 */
@Component({
  selector: 'app-bottom-tab-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppIconComponent, TranslatePipe],
  template: `
    <nav
      class="fixed inset-x-3 bottom-[calc(0.75rem_+_env(safe-area-inset-bottom))] z-40 rounded-xl bg-neutral-900 shadow-lg shadow-black/40 lg:hidden"
      [attr.aria-label]="'nav.main' | translate"
    >
      <ul class="flex h-16 items-stretch px-1">
        @for (item of items(); track item.route) {
          <li class="min-w-0 flex-1">
            <a
              [routerLink]="item.route"
              [attr.aria-current]="isActive(item) ? 'page' : null"
              [class]="tabClass(item)"
            >
              <app-icon [name]="item.icon" iconClass="w-6 h-6 fill-current" />
              <span class="max-w-full truncate px-1 text-[11px] font-semibold leading-none">{{ item.tabKey | translate }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class BottomTabBarComponent {
  readonly items = input.required<readonly NavItem[]>();
  /** The current page, so each tab can tell whether it is the active one. */
  readonly currentUrl = input.required<string>();

  isActive(item: NavItem): boolean {
    return isNavItemActive(item, this.currentUrl());
  }

  tabClass(item: NavItem): string {
    return `${TAB_BASE} ${this.isActive(item) ? 'text-tenant-primary' : 'text-neutral-500 hover:text-neutral-200'}`;
  }
}
