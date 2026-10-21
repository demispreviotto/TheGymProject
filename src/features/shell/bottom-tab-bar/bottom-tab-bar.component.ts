import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';
import type { NavItem } from '../app-shell/nav-items';

const TAB_BASE = 'flex h-full min-h-12 w-full flex-col items-center justify-center gap-1 transition-colors';

/**
 * Mobile-only bottom navigation. Shows the role's tab items plus a "More" button that asks
 * the shell to open the full menu (remaining pages, language, sign out). Hidden from `lg` up,
 * where the sidebar takes over.
 */
@Component({
  selector: 'app-bottom-tab-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, AppIconComponent, TranslatePipe],
  template: `
    <nav
      class="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      [attr.aria-label]="'nav.main' | translate"
    >
      <ul class="flex h-16 items-stretch px-1">
        @for (item of items(); track item.route) {
          <li class="min-w-0 flex-1">
            <a
              [routerLink]="item.route"
              routerLinkActive
              #link="routerLinkActive"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              [attr.aria-current]="link.isActive ? 'page' : null"
              [class]="tabClass(link.isActive)"
            >
              <app-icon [name]="item.icon" iconClass="w-6 h-6 fill-current" />
              <span class="max-w-full truncate px-1 text-[11px] font-semibold leading-none">{{ item.tabKey | translate }}</span>
            </a>
          </li>
        }
        <li class="min-w-0 flex-1">
          <button type="button" (click)="more.emit()" [class]="tabClass(false)">
            <app-icon name="dots-three" iconClass="w-6 h-6 fill-current" />
            <span class="max-w-full truncate px-1 text-[11px] font-semibold leading-none">{{ 'tab.more' | translate }}</span>
          </button>
        </li>
      </ul>
    </nav>
  `,
})
export class BottomTabBarComponent {
  readonly items = input.required<readonly NavItem[]>();

  /** The user tapped "More". */
  readonly more = output<void>();

  tabClass(active: boolean): string {
    return `${TAB_BASE} ${active ? 'text-tenant-primary' : 'text-neutral-500 hover:text-neutral-200'}`;
  }
}
