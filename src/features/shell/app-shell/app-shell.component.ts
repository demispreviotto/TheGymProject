import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TenantBrandingComponent } from '../../../shared/components/tenant-branding/tenant-branding.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';
import type { Language } from '../../../core/auth/auth.types';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TenantBrandingComponent, TranslatePipe, AppIconComponent],
  template: `
    <div class="min-h-screen bg-neutral-950 text-neutral-100 flex">

      <!-- Mobile top bar -->
      <header class="lg:hidden fixed top-0 inset-x-0 z-30 h-14 border-b border-neutral-800 bg-neutral-950 px-4 flex items-center justify-between">
        <button
          (click)="toggleDrawer()"
          class="p-2 -ml-1 rounded-md text-neutral-400 hover:text-neutral-100 transition-colors"
          aria-label="Open navigation"
        >
          <app-icon name="bars" iconClass="w-5 h-5" />
        </button>
        <app-tenant-branding />
        <span class="text-xs text-neutral-500 truncate max-w-[100px]">{{ auth.profile()?.name }}</span>
      </header>

      <!-- Mobile backdrop -->
      @if (drawerOpen()) {
        <div class="lg:hidden fixed inset-0 z-40 bg-black/60" (click)="closeDrawer()"></div>
      }

      <!-- Sidebar / Drawer -->
      <aside [class]="sidebarClass()">
        <div class="px-4 py-4 border-b border-neutral-800 flex-shrink-0">
          <app-tenant-branding />
          <p class="mt-1 text-xs text-neutral-500 truncate">{{ auth.profile()?.name }}</p>
        </div>

        <nav class="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
          @if (isAdmin()) {
            <a routerLink="/admin/requests" routerLinkActive="bg-neutral-800 text-neutral-100"
               (click)="closeDrawer()" class="nav-link">
              <app-icon name="envelope" iconClass="w-4 h-4 flex-shrink-0" />
              {{ 'nav.admin.requests' | translate }}
            </a>
            <a routerLink="/admin/users" routerLinkActive="bg-neutral-800 text-neutral-100"
               (click)="closeDrawer()" class="nav-link">
              <app-icon name="user-group" iconClass="w-4 h-4 flex-shrink-0" />
              {{ 'nav.admin.users' | translate }}
            </a>
          } @else if (isTrainer()) {
            <a routerLink="/trainer/exercises" routerLinkActive="bg-neutral-800 text-neutral-100"
               (click)="closeDrawer()" class="nav-link">
              <app-icon name="bars" iconClass="w-4 h-4 flex-shrink-0" />
              {{ 'nav.exercises' | translate }}
            </a>
            <a routerLink="/trainer/planning" routerLinkActive="bg-neutral-800 text-neutral-100"
               (click)="closeDrawer()" class="nav-link">
              <app-icon name="calendar" iconClass="w-4 h-4 flex-shrink-0" />
              {{ 'nav.plans' | translate }}
            </a>
            <a routerLink="/trainer/clients" routerLinkActive="bg-neutral-800 text-neutral-100"
               (click)="closeDrawer()" class="nav-link">
              <app-icon name="users" iconClass="w-4 h-4 flex-shrink-0" />
              {{ 'nav.clients' | translate }}
            </a>
          } @else if (!isAdmin()) {
            <a routerLink="/dashboard" routerLinkActive="bg-neutral-800 text-neutral-100"
               [routerLinkActiveOptions]="{ exact: true }" (click)="closeDrawer()" class="nav-link">
              <app-icon name="bolt" iconClass="w-4 h-4 flex-shrink-0" />
              {{ 'nav.workout' | translate }}
            </a>
          }

          @if (isFreeOrAdmin()) {
            <a routerLink="/my-plan/planning" routerLinkActive="bg-neutral-800 text-neutral-100"
               (click)="closeDrawer()" class="nav-link">
               <app-icon name="strategy" iconClass="w-4 h-4 flex-shrink-0" />
               {{ 'nav.myplan.planning' | translate }}
               </a>
               <a routerLink="/my-plan/exercises" routerLinkActive="bg-neutral-800 text-neutral-100"
               (click)="closeDrawer()" class="nav-link">
               <app-icon name="list-numbers" iconClass="w-4 h-4 flex-shrink-0" />
              {{ 'nav.myplan.exercises' | translate }}
            </a>
            <a routerLink="/my-plan/friends" routerLinkActive="bg-neutral-800 text-neutral-100"
               (click)="closeDrawer()" class="nav-link">
              <app-icon name="users" iconClass="w-4 h-4 flex-shrink-0" />
              {{ 'nav.myplan.friends' | translate }}
            </a>
          }

          <a routerLink="/profile" routerLinkActive="bg-neutral-800 text-neutral-100"
             (click)="closeDrawer()" class="nav-link">
            <app-icon name="user" iconClass="w-4 h-4 flex-shrink-0" />
            {{ 'nav.profile' | translate }}
          </a>
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
        <main class="flex-1 p-4 lg:p-6 overflow-y-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .nav-link {
      @apply flex items-center gap-2 px-3 py-2 rounded-md text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors;
    }
  `],
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  readonly langService = inject(LanguageService);

  readonly drawerOpen = signal(false);
  readonly isTrainer = computed(() => this.auth.profile()?.role === 'trainer');
  readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');
  readonly isFreeOrAdmin = computed(() => {
    const role = this.auth.profile()?.role;
    return role === 'free' || role === 'admin';
  });

  readonly sidebarClass = computed(() => {
    const base =
      'fixed inset-y-0 left-0 z-50 w-56 bg-neutral-900 border-r border-neutral-800 flex flex-col transition-transform duration-200 lg:translate-x-0';
    const mobileClass = this.drawerOpen() ? 'translate-x-0' : '-translate-x-full';
    return `${base} ${mobileClass}`;
  });

  langBtnClass(lang: Language): string {
    const active = this.langService.activeLanguage() === lang;
    return active
      ? 'text-xs font-semibold text-neutral-100'
      : 'text-xs text-neutral-500 hover:text-neutral-300 transition-colors';
  }

  toggleDrawer(): void { this.drawerOpen.update(v => !v); }
  closeDrawer(): void { this.drawerOpen.set(false); }
  setLanguage(lang: Language): void { this.langService.setLanguage(lang); }
}
