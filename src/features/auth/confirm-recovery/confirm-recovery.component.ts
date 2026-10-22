import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Landing page of the recovery email. The token is only spent when the user presses the
 * button: mail scanners and link previewers load the page but never click.
 */
@Component({
  selector: 'app-confirm-recovery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div class="w-full max-w-sm space-y-6">

        <div class="text-center">
          <h1 class="text-2xl font-bold tracking-tight text-neutral-100">Reset your password</h1>
          <p class="mt-1 text-sm text-neutral-400">Continue to choose a new password.</p>
        </div>

        @if (!tokenHash) {
          <div class="rounded-md bg-red-950 px-4 py-4 text-sm text-red-300 text-center space-y-1">
            <p class="font-medium">Invalid link</p>
            <p class="text-red-400">This reset link is incomplete. Request a new one.</p>
          </div>
        } @else {
          @if (error()) {
            <p class="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300 text-center">{{ error() }}</p>
          }
          <button type="button" (click)="onContinue()" [disabled]="submitting()"
            class="w-full rounded-md bg-[hsl(var(--tenant-primary))] px-4 py-2 text-sm font-semibold
                   text-[hsl(var(--tenant-contrast))] transition-colors
                   hover:bg-[hsl(var(--tenant-hover))] disabled:opacity-50 disabled:cursor-not-allowed">
            {{ submitting() ? 'Verifying…' : 'Continue' }}
          </button>
        }

        <p class="text-center text-sm">
          <a routerLink="/forgot-password" class="text-neutral-400 hover:text-neutral-200 transition-colors">
            Request a new link
          </a>
        </p>

      </div>
    </div>
  `,
})
export class ConfirmRecoveryComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly tokenHash = inject(ActivatedRoute).snapshot.queryParamMap.get('token_hash');
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);

  async onContinue(): Promise<void> {
    if (!this.tokenHash) return;
    this.error.set(null);
    this.submitting.set(true);

    const err = await this.auth.verifyRecoveryToken(this.tokenHash);
    if (err) {
      this.error.set('This reset link has expired or was already used. Request a new one.');
      this.submitting.set(false);
      return;
    }
    await this.router.navigate(['/reset-password'], { replaceUrl: true });
  }
}
