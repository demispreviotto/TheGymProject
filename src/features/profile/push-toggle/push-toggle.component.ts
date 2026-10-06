import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PushNotificationService } from '../../../core/push/push-notification.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-push-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (push.isSupported) {
      <div class="flex items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-4">
        <div>
          <p class="text-sm font-medium text-neutral-100">{{ 'push.title' | translate }}</p>
          <p class="text-xs text-neutral-500">{{ 'push.hint' | translate }}</p>
          @if (failed()) {
            <p class="mt-1 text-xs text-red-400">{{ 'push.error' | translate }}</p>
          }
        </div>
        @if (push.isSubscribed()) {
          <span class="text-xs text-neutral-400">{{ 'push.enabled' | translate }}</span>
        } @else {
          <button
            type="button"
            (click)="enable()"
            [disabled]="busy()"
            class="rounded-md bg-[hsl(var(--tenant-primary))] px-3 py-1.5 text-sm font-medium text-neutral-100 disabled:opacity-50"
          >
            {{ 'push.enable' | translate }}
          </button>
        }
      </div>
    }
  `,
})
export class PushToggleComponent {
  readonly push = inject(PushNotificationService);
  readonly busy = signal(false);
  readonly failed = signal(false);

  async enable(): Promise<void> {
    this.busy.set(true);
    this.failed.set(false);
    try {
      await this.push.enable();
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
