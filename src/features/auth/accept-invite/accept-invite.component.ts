import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppIconComponent } from '../../../shared/ui/icons/app-icon.component';

type PageState = 'ready' | 'invalid';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIconComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div class="w-full max-w-sm space-y-6 text-center">

        <div>
          <h1 class="text-2xl font-bold tracking-tight text-neutral-100">Gym Planificación</h1>
          <p class="mt-1 text-sm text-neutral-400">You've been invited</p>
        </div>

        @if (state() === 'ready') {
          <div class="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
            <p class="text-sm text-neutral-300">
              Tap the button below to accept your invitation and set up your account.
            </p>
            <a [href]="inviteUrl"
              class="flex items-center justify-center gap-2 w-full rounded-md
                     bg-[hsl(var(--tenant-primary))] px-4 py-3 text-sm font-semibold
                     text-[hsl(var(--tenant-contrast))] hover:bg-[hsl(var(--tenant-hover))]
                     transition-colors">
              Accept invitation
            </a>
            <p class="text-xs text-neutral-600">This link is for your use only and expires in 24 h.</p>
          </div>
        }

        @if (state() === 'invalid') {
          <div class="rounded-md bg-red-950 px-4 py-4 text-sm text-red-300 space-y-1">
            <p class="font-medium">Invalid invite link</p>
            <p class="text-red-400">This link is missing required parameters. Contact the person who invited you.</p>
          </div>
        }

      </div>
    </div>
  `,
})
export class AcceptInviteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly state = signal<PageState>('ready');
  inviteUrl = '';

  ngOnInit(): void {
    const link = this.route.snapshot.queryParamMap.get('link');
    if (!link) {
      this.state.set('invalid');
      return;
    }
    try {
      this.inviteUrl = decodeURIComponent(link);
    } catch {
      this.state.set('invalid');
    }
  }
}
