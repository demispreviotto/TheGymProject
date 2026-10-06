import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NetworkStatusService } from '../../../core/network/network-status.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (!network.online()) {
      <div
        role="status"
        class="pointer-events-auto rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-center text-xs text-neutral-300 shadow-xl"
      >
        {{ 'pwa.offline' | translate }}
      </div>
    }
  `,
})
export class OfflineBannerComponent {
  readonly network = inject(NetworkStatusService);
}
