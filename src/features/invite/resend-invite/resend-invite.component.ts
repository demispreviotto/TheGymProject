import {
  Component, DestroyRef, inject, input, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { InviteService } from '../../../core/invites/invite.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { shareOrCopy } from '../../../shared/utils/share';

/** HTTP status the edge function answers when the user already registered. */
const ALREADY_REGISTERED = 409;
const SHARED_FEEDBACK_MS = 2000;

/**
 * "Resend invite" for a user who was invited but never finished registering. Two steps on
 * purpose: the first click asks for a fresh link, the second shares it. Sharing straight
 * after the network call would run outside the click's user gesture, and mobile browsers
 * then refuse to open the share sheet.
 */
@Component({
  selector: 'app-resend-invite',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <!-- Rows that contain this are clickable: the button must not also open the row. -->
    <div class="flex flex-col items-start gap-1" (click)="$event.stopPropagation()">
      @if (link()) {
        <button type="button" (click)="share()"
          class="rounded-md bg-[hsl(var(--tenant-primary))] px-2.5 py-1 text-xs font-medium
                 text-[hsl(var(--tenant-contrast))] hover:bg-[hsl(var(--tenant-hover))] transition-colors">
          {{ shared() ? ('invite.shared' | translate) : ('invite.share' | translate) }}
        </button>
      } @else {
        <button type="button" (click)="resend()" [disabled]="sending()"
          class="rounded-md border border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-300
                 hover:bg-neutral-800 hover:text-neutral-100 disabled:opacity-50
                 disabled:cursor-not-allowed transition-colors">
          {{ sending() ? ('invite.generating' | translate) : ('invite.resend' | translate) }}
        </button>
      }
      @if (error()) {
        <p class="text-xs text-red-400">{{ error() }}</p>
      }
    </div>
  `,
})
export class ResendInviteComponent {
  private readonly invites = inject(InviteService);
  private readonly lang = inject(LanguageService);

  readonly email = input.required<string>();

  readonly sending = signal(false);
  readonly link = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly shared = signal(false);

  private sharedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.sharedTimer) clearTimeout(this.sharedTimer);
    });
  }

  async resend(): Promise<void> {
    this.sending.set(true);
    this.error.set(null);

    const outcome = await this.invites.createLink(this.email());
    this.sending.set(false);
    if (outcome.link) {
      this.link.set(outcome.link);
      return;
    }
    this.error.set(
      outcome.status === ALREADY_REGISTERED
        ? this.lang.t('invite.resend.registered')
        : outcome.error ?? this.lang.t('invite.error.failed'),
    );
  }

  async share(): Promise<void> {
    const link = this.link();
    if (!link) return;
    try {
      await shareOrCopy(
        link,
        'Gym Planificación — Invitation',
        `You've been invited to join Gym Planificación! Tap the link to set up your account.`,
      );
    } catch (err) {
      // Dismissing the share sheet rejects with AbortError: not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      this.error.set(this.lang.t('invite.error.failed'));
      return;
    }
    this.shared.set(true);
    this.sharedTimer = setTimeout(() => this.shared.set(false), SHARED_FEEDBACK_MS);
  }
}
