import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '../core/theme/theme.service';
import { AuthService } from '../core/auth/auth.service';
import { UpdatePromptComponent } from '../shared/components/update-prompt/update-prompt.component';
import { OfflineBannerComponent } from '../shared/components/offline-banner/offline-banner.component';
import { SplashComponent } from '../shared/components/splash/splash.component';
import { AppLaunchService } from '../core/pwa/app-launch.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UpdatePromptComponent, OfflineBannerComponent, SplashComponent],
  template: `
    <router-outlet />
    <div class="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3">
      <app-offline-banner />
      <app-update-prompt />
    </div>
    <app-splash />
  `,
})
export class AppComponent implements OnInit {
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly launch = inject(AppLaunchService);

  ngOnInit(): void {
    this.auth.initialize();
    void this.launch.start();
  }
}
