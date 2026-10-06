import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PwaUpdateService } from '../../../core/pwa/pwa-update.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-update-prompt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (pwa.updateReady() && !dismissed()) {
      <div
        role="status"
        class="pointer-events-auto flex items-center gap-3 rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-3 shadow-xl"
      >
        <span class="text-sm text-neutral-100">{{ 'pwa.update.message' | translate }}</span>
        <button
          type="button"
          (click)="pwa.applyUpdate()"
          class="rounded-md bg-[hsl(var(--tenant-primary))] px-3 py-1.5 text-sm font-medium text-neutral-100"
        >
          {{ 'pwa.update.action' | translate }}
        </button>
        <button
          type="button"
          (click)="dismissed.set(true)"
          class="text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
        >
          {{ 'pwa.update.dismiss' | translate }}
        </button>
      </div>
    }
  `,
})
export class UpdatePromptComponent {
  readonly pwa = inject(PwaUpdateService);
  readonly dismissed = signal(false);
}
