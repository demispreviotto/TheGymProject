import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppLaunchService } from '../../../core/pwa/app-launch.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AppIconComponent } from '../../ui/icons/app-icon.component';

/**
 * In-app continuation of the native launch screen (same background, same lockers icon, same
 * spot), so there is no blank page between the iOS splash image and the first screen.
 */
@Component({
  selector: 'app-splash',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIconComponent, TranslatePipe],
  template: `
    @if (launch.splashVisible()) {
      <div
        role="status"
        aria-live="polite"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950"
      >
        <app-icon name="lockers" iconClass="h-16 w-16 fill-current text-red-500" />
        @if (launch.updating()) {
          <div class="absolute top-[calc(50%+3.5rem)]">
            <app-icon name="spinner" iconClass="h-6 w-6 animate-spin fill-current text-neutral-400" />
            <span class="sr-only">{{ 'pwa.updating' | translate }}</span>
          </div>
        }
      </div>
    }
  `,
})
export class SplashComponent {
  readonly launch = inject(AppLaunchService);
}
