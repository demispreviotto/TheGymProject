import { Component, inject, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { FriendshipService } from '../../../core/friendships/friendship.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { InviteRequestService } from '../../../core/invite-requests/invite-request.service';
import { CountdownTimerService } from '../../../core/timer/countdown-timer.service';
import { TenantBrandingComponent } from '../../../shared/components/tenant-branding/tenant-branding.component';
import { CountdownTimerComponent } from '../../../shared/components/countdown-timer/countdown-timer.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';
import type { Language } from '../../../core/auth/auth.types';
import { BottomTabBarComponent } from '../bottom-tab-bar/bottom-tab-bar.component';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import {
  PROFILE_NAV_ITEM, isNavItemActive, navItemsForRole, showsTabBar, sidebarItemsForRole, type NavItem,
} from './nav-items';

const NAV_LINK_BASE = 'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors';

/**
 * Space the floating bottom tab bar takes up (its 4rem height plus its 0.75rem margin), exposed as a
 * CSS variable so everything that sits above it (page padding, snap-panel height, the rest-timer
 * toast) follows whether the bar is shown. The safe area inset is added where the variable is used,
 * because it applies with or without the bar.
 */
const TAB_BAR_SHOWN = '[--tabbar-h:4.75rem]';
const TAB_BAR_HIDDEN = '[--tabbar-h:0px]';

/**
 * App layout. Below `lg` it is a top bar (tenant, and the avatar that opens the profile) plus a
 * bottom tab bar when the role has several pages; language and sign-out live on the profile page
 * there. From `lg` up it is a fixed sidebar that also lists Profile.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'layoutVars()' },
  imports: [
    RouterOutlet, RouterLink, TenantBrandingComponent, CountdownTimerComponent,
    TranslatePipe, AppIconComponent, BottomTabBarComponent, UserAvatarComponent,
  ],
  template: `
    <div class="min-h-screen bg-neutral-950 text-neutral-100 flex">

      <!-- Mobile top bar -->
      <header class="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-neutral-950 px-4 flex items-center justify-between max-w-[100dvw]">
        <app-tenant-branding />
        <app-user-avatar [showDot]="hasNotifications()" [active]="profileActive()" />
      </header>

      <!-- Desktop sidebar -->
      <aside class="hidden lg:flex fixed inset-y-0 left-0 z-50 w-56 flex-col bg-neutral-900 border-r border-neutral-800">
        <div class="px-4 py-4 border-b border-neutral-800 flex-shrink-0">
          <app-tenant-branding />
          <p class="mt-1 text-xs text-neutral-500 truncate">{{ auth.profile()?.name }}</p>
        </div>

        <nav class="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
          @for (item of sidebarItems(); track item.route) {
            <a [routerLink]="item.route" [class]="navLinkClass(item)">
              <app-icon [name]="item.icon" iconClass="w-4 h-4 flex-shrink-0" />
              {{ item.labelKey | translate }}
            </a>
          }
        </nav>

        <div class="p-3 border-t border-neutral-800 flex-shrink-0 space-y-1">
          <!-- Language toggle -->
          <div class="flex items-center justify-between px-3 py-1.5">
            <span class="text-xs text-neutral-500">{{ 'profile.language' | translate }}</span>
            <div class="flex items-center gap-1">
              <button
                (click)="setLanguage('en')"
                [class]="langBtnClass('en')"
              >EN</button>
              <span class="text-neutral-700 text-xs">|</span>
              <button
                (click)="setLanguage('es')"
                [class]="langBtnClass('es')"
              >ES</button>
            </div>
          </div>

          <!-- Sign out -->
          <button
            (click)="auth.signOut()"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <app-icon name="arrow-right-from-bracket" iconClass="w-4 h-4 flex-shrink-0" />
            {{ 'nav.signout' | translate }}
          </button>
        </div>
      </aside>

      <!-- Page content -->
      <div class="flex-1 lg:ml-56 flex flex-col min-h-screen">
        <div class="h-14 lg:hidden flex-shrink-0"></div>
        <main class="flex-1 p-4 pb-[calc(var(--tabbar-h)_+_1.5rem_+_env(safe-area-inset-bottom))] lg:p-6 overflow-y-auto max-w-[100dvw]">
          <router-outlet />
        </main>
      </div>
    </div>

    @if (showTabBar()) {
      <app-bottom-tab-bar [items]="navItems()" [currentUrl]="currentUrl()" />
    }
    <app-countdown-timer />
  `,
})
export class AppShellComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly langService = inject(LanguageService);
  private readonly friendships = inject(FriendshipService);
  private readonly inviteRequests = inject(InviteRequestService);
  private readonly router = inject(Router);
  private readonly restTimer = inject(CountdownTimerService);

  /** Current page, as a signal: router events are an async stream, converted at the boundary. */
  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');
  readonly isFreeOrAdmin = computed(() => {
    const role = this.auth.profile()?.role;
    return role === 'free' || role === 'admin';
  });

  /** The role's pages: one bottom tab each. */
  readonly navItems = computed(() => navItemsForRole(this.auth.profile()?.role));
  /** The same pages plus Profile, for the desktop sidebar (which has no avatar). */
  readonly sidebarItems = computed(() => sidebarItemsForRole(this.auth.profile()?.role));
  readonly showTabBar = computed(() => showsTabBar(this.navItems()));
  readonly layoutVars = computed(() => (this.showTabBar() ? TAB_BAR_SHOWN : TAB_BAR_HIDDEN));
  readonly profileActive = computed(() => isNavItemActive(PROFILE_NAV_ITEM, this.currentUrl()));

  /** Pending friend requests (free/admin) or pending invite requests (admin) are waiting for an answer. */
  readonly hasNotifications = computed(
    () => this.friendships.pendingReceived().length > 0 || this.inviteRequests.pendingCount() > 0,
  );

  ngOnInit(): void {
    if (this.isFreeOrAdmin()) void this.friendships.load();
    if (this.isAdmin()) void this.inviteRequests.loadAllRequests();
  }

  /** The shell lives as long as the session: a rest timer survives page changes but not signing out. */
  ngOnDestroy(): void {
    this.restTimer.cancel();
  }

  navLinkClass(item: NavItem): string {
    const state = isNavItemActive(item, this.currentUrl())
      ? 'bg-neutral-800 text-neutral-100'
      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800';
    return `${NAV_LINK_BASE} ${state}`;
  }

  langBtnClass(lang: Language): string {
    const active = this.langService.activeLanguage() === lang;
    return active
      ? 'text-xs font-semibold text-neutral-100'
      : 'text-xs text-neutral-500 hover:text-neutral-300 transition-colors';
  }

  setLanguage(lang: Language): void { this.langService.setLanguage(lang); }
}
