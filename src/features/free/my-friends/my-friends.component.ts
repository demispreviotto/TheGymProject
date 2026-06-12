import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FriendshipService } from '../../../core/friendships/friendship.service';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import type { Friendship } from '../../../core/friendships/friendship.service';

@Component({
  selector: 'app-my-friends',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe],
  template: `
    <div class="space-y-6 max-w-lg">

      <h1 class="text-xl font-semibold">{{ 'myplan.friends.title' | translate }}</h1>

      <!-- Add friend -->
      <div class="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-neutral-200">{{ 'myplan.friends.add' | translate }}</p>
          <button (click)="shareMyContact()"
            class="text-xs px-3 py-1.5 rounded-md border border-neutral-700 text-neutral-400
                   hover:border-neutral-500 hover:text-neutral-200 transition-colors">
            {{ 'myplan.friends.share.contact' | translate }}
          </button>
        </div>
        <div class="flex gap-2">
          <input
            type="email"
            [ngModel]="addEmail()"
            (ngModelChange)="addEmail.set($event)"
            placeholder="friend@email.com"
            class="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100
                   placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />
          <button
            (click)="sendRequest()"
            [disabled]="adding()"
            class="px-4 py-2 rounded-lg bg-[hsl(var(--tenant-primary))] text-[hsl(var(--tenant-contrast))]
                   text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {{ adding() ? ('common.loading' | translate) : ('myplan.friends.add' | translate) }}
          </button>
        </div>
        @if (addError()) {
          <p class="text-xs text-red-400">{{ addError() }}</p>
        }
        @if (addSuccess()) {
          <p class="text-xs text-green-400">{{ 'myplan.friends.request.sent' | translate }}</p>
        }
      </div>

      <!-- Pending received -->
      @if (service.pendingReceived().length > 0) {
        <div class="space-y-2">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            {{ 'myplan.friends.pending' | translate }}
          </h2>
          <div class="rounded-lg border border-neutral-800 overflow-hidden">
            @for (f of service.pendingReceived(); track f.id) {
              <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800 last:border-0">
                <div>
                  <p class="text-sm font-medium text-neutral-100">{{ f.requester?.name }}</p>
                  <p class="text-xs text-neutral-500">{{ f.requester?.email }}</p>
                </div>
                <div class="flex gap-2">
                  <button (click)="service.accept(f.id)"
                    class="text-xs px-3 py-1.5 rounded-md bg-[hsl(var(--tenant-primary))]/20 text-[hsl(var(--tenant-primary))]
                           hover:bg-[hsl(var(--tenant-primary))]/30 transition-colors">
                    {{ 'myplan.friends.accept' | translate }}
                  </button>
                  <button (click)="service.reject(f.id)"
                    class="text-xs px-3 py-1.5 rounded-md bg-neutral-800 text-neutral-400
                           hover:bg-neutral-700 hover:text-neutral-200 transition-colors">
                    {{ 'myplan.friends.reject' | translate }}
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Friends -->
      <div class="space-y-2">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          {{ 'myplan.friends.title' | translate }}
        </h2>
        @if (service.friends().length === 0) {
          <p class="text-sm text-neutral-600 py-4">{{ 'myplan.friends.empty' | translate }}</p>
        } @else {
          <div class="rounded-lg border border-neutral-800 overflow-hidden">
            @for (f of service.friends(); track f.id) {
              <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800 last:border-0">
                <div>
                  <p class="text-sm font-medium text-neutral-100">{{ friendName(f) }}</p>
                  <p class="text-xs text-neutral-500">{{ friendEmail(f) }}</p>
                </div>
                <span class="text-xs text-green-400 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded">
                  {{ 'myplan.friends.connected' | translate }}
                </span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Sent / pending outgoing -->
      @if (service.pendingSent().length > 0) {
        <div class="space-y-2">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            {{ 'myplan.friends.sent' | translate }}
          </h2>
          <div class="rounded-lg border border-neutral-800 overflow-hidden">
            @for (f of service.pendingSent(); track f.id) {
              <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-800 last:border-0">
                <div>
                  <p class="text-sm font-medium text-neutral-100">{{ f.addressee?.name }}</p>
                  <p class="text-xs text-neutral-500">{{ f.addressee?.email }}</p>
                </div>
                <button (click)="service.cancel(f.id)"
                  class="text-xs px-3 py-1.5 rounded-md bg-neutral-800 text-neutral-400
                         hover:bg-red-950 hover:text-red-300 transition-colors">
                  {{ 'myplan.friends.cancel' | translate }}
                </button>
              </div>
            }
          </div>
        </div>
      }

    </div>
  `,
})
export class MyFriendsComponent implements OnInit {
  readonly service = inject(FriendshipService);
  private readonly auth = inject(AuthService);

  readonly addEmail = signal('');
  readonly adding = signal(false);
  readonly addError = signal<string | null>(null);
  readonly addSuccess = signal(false);

  ngOnInit(): void { this.service.load(); }

  async shareMyContact(): Promise<void> {
    const me = this.auth.profile();
    if (!me) return;
    const shareData = {
      title: 'Gym Planificación — Connect with me',
      text: `Add me as a friend on Gym Planificación! My email is: ${me.email}`,
      url: window.location.origin + '/my-plan/friends',
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(`${shareData.text} — ${shareData.url}`);
    }
  }

  async sendRequest(): Promise<void> {
    const email = this.addEmail().trim();
    this.addError.set(null);
    this.addSuccess.set(false);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.addError.set('Enter a valid email address.');
      return;
    }
    this.adding.set(true);
    const err = await this.service.sendRequest(email);
    this.adding.set(false);
    if (err) { this.addError.set(err); return; }
    this.addSuccess.set(true);
    this.addEmail.set('');
  }

  friendName(f: Friendship): string {
    const me = this.auth.profile()?.id;
    return f.requester_id === me ? (f.addressee?.name ?? '—') : (f.requester?.name ?? '—');
  }

  friendEmail(f: Friendship): string {
    const me = this.auth.profile()?.id;
    return f.requester_id === me ? (f.addressee?.email ?? '') : (f.requester?.email ?? '');
  }
}
