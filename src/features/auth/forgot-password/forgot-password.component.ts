import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { isValidEmail } from '../../../shared/utils/validators';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div class="w-full max-w-sm space-y-6">

        <div class="text-center">
          <h1 class="text-2xl font-bold tracking-tight text-neutral-100">Forgot your password?</h1>
          <p class="mt-1 text-sm text-neutral-400">
            Enter your email and we'll send you a link to set a new one.
          </p>
        </div>

        @if (sent()) {
          <div class="rounded-md bg-neutral-900 px-4 py-4 text-sm text-neutral-300 text-center space-y-1">
            <p class="font-medium text-neutral-100">Check your inbox</p>
            <p>If an account exists for that email, we sent a reset link. It may take a minute.</p>
          </div>
        } @else {
          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="space-y-1">
              <label for="email" class="block text-sm font-medium text-neutral-300">Email</label>
              <input id="email" name="email" type="email" required autocomplete="email"
                [ngModel]="email()" (ngModelChange)="email.set($event)"
                class="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm
                       text-neutral-100 placeholder-neutral-500 focus:border-[hsl(var(--tenant-primary))]
                       focus:outline-none focus:ring-1 focus:ring-[hsl(var(--tenant-primary))]"
                placeholder="you@example.com" />
            </div>

            @if (error()) {
              <p class="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{{ error() }}</p>
            }

            <button type="submit" [disabled]="submitting()"
              class="w-full rounded-md bg-[hsl(var(--tenant-primary))] px-4 py-2 text-sm font-semibold
                     text-[hsl(var(--tenant-contrast))] transition-colors
                     hover:bg-[hsl(var(--tenant-hover))] disabled:opacity-50 disabled:cursor-not-allowed">
              {{ submitting() ? 'Sending…' : 'Send reset link' }}
            </button>
          </form>
        }

        <p class="text-center text-sm">
          <a routerLink="/login" class="text-neutral-400 hover:text-neutral-200 transition-colors">Back to sign in</a>
        </p>

      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  readonly email = signal('');
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly sent = signal(false);

  async onSubmit(): Promise<void> {
    const email = this.email().trim();
    this.error.set(null);
    if (!isValidEmail(email)) { this.error.set('Enter a valid email address.'); return; }

    this.submitting.set(true);
    const err = await this.auth.requestPasswordReset(email);
    this.submitting.set(false);

    if (err) this.error.set(err);
    else this.sent.set(true);
  }
}
