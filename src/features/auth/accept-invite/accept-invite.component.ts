import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { isInviteLinkType, type InviteLinkType } from '../../../core/auth/auth.types';

interface InviteToken {
  hash: string;
  type: InviteLinkType;
}

/**
 * Landing page of an invite link. The one-time token is only spent when the user presses
 * the button: link previews and scanners load this page but never click.
 *
 * Links issued before the token_hash format carry the raw Supabase URL in `?link=`; those
 * keep working as a plain anchor until they expire.
 */
@Component({
  selector: 'app-accept-invite',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div class="w-full max-w-sm space-y-6 text-center">

        <div>
          <h1 class="text-2xl font-bold tracking-tight text-neutral-100">Gym Planificación</h1>
          <p class="mt-1 text-sm text-neutral-400">You've been invited</p>
        </div>

        @if (token || legacyUrl) {
          <div class="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
            <p class="text-sm text-neutral-300">
              Tap the button below to accept your invitation and set up your account.
            </p>

            @if (error()) {
              <p class="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{{ error() }}</p>
            }

            @if (token) {
              <button type="button" (click)="onAccept()" [disabled]="submitting()"
                class="flex items-center justify-center gap-2 w-full rounded-md
                       bg-[hsl(var(--tenant-primary))] px-4 py-3 text-sm font-semibold
                       text-[hsl(var(--tenant-contrast))] hover:bg-[hsl(var(--tenant-hover))]
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {{ submitting() ? 'Verifying…' : 'Accept invitation' }}
              </button>
            } @else {
              <a [href]="legacyUrl"
                class="flex items-center justify-center gap-2 w-full rounded-md
                       bg-[hsl(var(--tenant-primary))] px-4 py-3 text-sm font-semibold
                       text-[hsl(var(--tenant-contrast))] hover:bg-[hsl(var(--tenant-hover))]
                       transition-colors">
                Accept invitation
              </a>
            }
            <p class="text-xs text-neutral-600">This link is for your use only and expires in 24 h.</p>
          </div>
        } @else {
          <div class="rounded-md bg-red-950 px-4 py-4 text-sm text-red-300 space-y-1">
            <p class="font-medium">Invalid invite link</p>
            <p class="text-red-400">This link is missing required parameters. Contact the person who invited you.</p>
          </div>
        }

      </div>
    </div>
  `,
})
export class AcceptInviteComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  readonly token = this.readToken();
  readonly legacyUrl = this.token ? null : this.readLegacyUrl();
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);

  async onAccept(): Promise<void> {
    if (!this.token) return;
    this.error.set(null);
    this.submitting.set(true);

    const err = await this.auth.verifyInviteToken(this.token.hash, this.token.type);
    if (err) {
      this.error.set('This invitation has expired or was already used. Ask for a new one.');
      this.submitting.set(false);
      return;
    }
    await this.router.navigate(['/register'], { replaceUrl: true });
  }

  private readToken(): InviteToken | null {
    const hash = this.params.get('token_hash');
    const type = this.params.get('type');
    return hash && isInviteLinkType(type) ? { hash, type } : null;
  }

  private readLegacyUrl(): string | null {
    const link = this.params.get('link');
    if (!link) return null;
    try {
      return decodeURIComponent(link);
    } catch {
      return null;
    }
  }
}
