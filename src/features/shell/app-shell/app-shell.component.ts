import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TenantBrandingComponent } from '../../../shared/components/tenant-branding/tenant-branding.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import type { Language } from '../../../core/auth/auth.types';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TenantBrandingComponent, TranslatePipe],
  template: `
    <div class="min-h-screen bg-neutral-950 text-neutral-100 flex">

      <!-- Mobile top bar -->
      <header class="lg:hidden fixed top-0 inset-x-0 z-30 h-14 border-b border-neutral-800 bg-neutral-950 px-4 flex items-center justify-between">
        <button
          (click)="toggleDrawer()"
          class="p-2 -ml-1 rounded-md text-neutral-400 hover:text-neutral-100 transition-colors"
          aria-label="Open navigation"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
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
          @if (isTrainer()) {
            <a routerLink="/trainer/exercises" routerLinkActive="bg-neutral-800 text-neutral-100"
               (click)="closeDrawer()" class="nav-link">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
              {{ 'nav.exercises' | translate }}
            </a>
            <a routerLink="/trainer/planning" routerLinkActive="bg-neutral-800 text-neutral-100"
               (click)="closeDrawer()" class="nav-link">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              {{ 'nav.plans' | translate }}
            </a>
            <a routerLink="/trainer/clients" routerLinkActive="bg-neutral-800 text-neutral-100"
               (click)="closeDrawer()" class="nav-link">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
              {{ 'nav.clients' | translate }}
            </a>
          } @else {
            <a routerLink="/dashboard" routerLinkActive="bg-neutral-800 text-neutral-100"
               [routerLinkActiveOptions]="{ exact: true }" (click)="closeDrawer()" class="nav-link">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
              {{ 'nav.workout' | translate }}
            </a>
          }

          <a routerLink="/profile" routerLinkActive="bg-neutral-800 text-neutral-100"
             (click)="closeDrawer()" class="nav-link">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
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
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
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
