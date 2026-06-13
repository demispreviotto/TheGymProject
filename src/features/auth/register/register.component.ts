import {
  Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { AuthService } from '../../../core/auth/auth.service';
import type { RealtimeChannel, Subscription } from '@supabase/supabase-js';

type PageState = 'loading' | 'form' | 'submitting' | 'expired';

@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AppIconComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div class="w-full max-w-sm space-y-6">

        <div class="text-center">
          <h1 class="text-2xl font-bold tracking-tight text-neutral-100">Gym Planificación</h1>
          <p class="mt-1 text-sm text-neutral-400">Complete your registration</p>
        </div>

        @if (state() === 'loading') {
          <div class="flex justify-center py-8">
            <app-icon name="spinner" iconClass="animate-spin h-6 w-6 text-neutral-400" />
          </div>
        }

        @if (state() === 'expired') {
          <div class="rounded-md bg-red-950 px-4 py-4 text-sm text-red-300 text-center space-y-1">
            <p class="font-medium">Invite link expired</p>
            <p class="text-red-400">This invite link has expired or is invalid. Contact your trainer for a new one.</p>
          </div>
        }

        @if (state() === 'form' || state() === 'submitting') {
          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="space-y-1">
              <label for="name" class="block text-sm font-medium text-neutral-300">Display name</label>
              <input id="name" name="name" type="text" required autocomplete="name"
                [ngModel]="name()" (ngModelChange)="name.set($event)"
                class="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm
                       text-neutral-100 placeholder-neutral-500 focus:border-[hsl(var(--tenant-primary))]
                       focus:outline-none focus:ring-1 focus:ring-[hsl(var(--tenant-primary))]"
                placeholder="Your full name" />
            </div>

            <div class="space-y-1">
              <label for="password" class="block text-sm font-medium text-neutral-300">Password</label>
              <div class="relative">
                <input id="password" name="password" [type]="showPassword() ? 'text' : 'password'" required autocomplete="new-password"
                  [ngModel]="password()" (ngModelChange)="password.set($event)"
                  class="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 pr-10 text-sm
                         text-neutral-100 placeholder-neutral-500 focus:border-[hsl(var(--tenant-primary))]
                         focus:outline-none focus:ring-1 focus:ring-[hsl(var(--tenant-primary))]"
                  placeholder="Min. 6 characters" />
                <button type="button" (click)="showPassword.set(!showPassword())"
                  class="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500 hover:text-neutral-300 transition-colors">
                  <app-icon [name]="showPassword() ? 'eye-slash' : 'eye'" iconClass="w-4 h-4" />
                </button>
              </div>
            </div>

            <div class="space-y-1">
              <label for="confirm" class="block text-sm font-medium text-neutral-300">Confirm password</label>
              <div class="relative">
                <input id="confirm" name="confirm" [type]="showConfirmPassword() ? 'text' : 'password'" required autocomplete="new-password"
                  [ngModel]="confirmPassword()" (ngModelChange)="confirmPassword.set($event)"
                  class="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 pr-10 text-sm
                         text-neutral-100 placeholder-neutral-500 focus:border-[hsl(var(--tenant-primary))]
                         focus:outline-none focus:ring-1 focus:ring-[hsl(var(--tenant-primary))]"
                  placeholder="••••••••" />
                <button type="button" (click)="showConfirmPassword.set(!showConfirmPassword())"
                  class="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500 hover:text-neutral-300 transition-colors">
                  <app-icon [name]="showConfirmPassword() ? 'eye-slash' : 'eye'" iconClass="w-4 h-4" />
                </button>
              </div>
            </div>

            @if (error()) {
              <p class="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{{ error() }}</p>
            }

            <button type="submit" [disabled]="state() === 'submitting'"
              class="w-full rounded-md bg-[hsl(var(--tenant-primary))] px-4 py-2 text-sm font-semibold
                     text-[hsl(var(--tenant-contrast))] transition-colors
                     hover:bg-[hsl(var(--tenant-hover))] disabled:opacity-50 disabled:cursor-not-allowed">
              {{ state() === 'submitting' ? 'Saving…' : 'Complete registration' }}
            </button>
          </form>
        }

      </div>
    </div>
  `,
})
export class RegisterComponent implements OnInit, OnDestroy {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly state = signal<PageState>('loading');
  readonly name = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  private userId: string | null = null;
  private authSubscription: { unsubscribe(): void } | null = null;
  private expiredTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // Detect error in URL hash immediately (e.g. otp_expired, access_denied)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('error')) {
      this.state.set('expired');
      return;
    }

    const { data: { subscription } } = this.supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        this.userId = session.user.id;
        this.state.set('form');
        if (this.expiredTimer) clearTimeout(this.expiredTimer);
      }
    });
    this.authSubscription = subscription;

    // If no invite token is present or it is expired, show the expired state after 6s
    this.expiredTimer = setTimeout(() => {
      if (this.state() === 'loading') this.state.set('expired');
    }, 6000);
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    if (this.expiredTimer) clearTimeout(this.expiredTimer);
  }

  async onSubmit(): Promise<void> {
    this.error.set(null);
    const pw = this.password();
    const name = this.name().trim();

    if (!name) { this.error.set('Please enter your display name.'); return; }
    if (pw.length < 6) { this.error.set('Password must be at least 6 characters.'); return; }
    if (pw !== this.confirmPassword()) { this.error.set('Passwords do not match.'); return; }

    this.state.set('submitting');

    const { error: updateErr } = await this.supabase.auth.updateUser({ password: pw });
    if (updateErr) {
      this.error.set(updateErr.message);
      this.state.set('form');
      return;
    }

    if (this.userId) {
      await this.supabase.from('profiles').update({ name, is_active: true }).eq('id', this.userId);
    }

    await this.auth.refreshProfile();
    this.router.navigate(['/dashboard']);
  }
}
