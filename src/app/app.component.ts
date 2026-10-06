import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '../core/theme/theme.service';
import { AuthService } from '../core/auth/auth.service';
import { UpdatePromptComponent } from '../shared/components/update-prompt/update-prompt.component';
import { OfflineBannerComponent } from '../shared/components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UpdatePromptComponent, OfflineBannerComponent],
  template: `
    <router-outlet />
    <div class="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3">
      <app-offline-banner />
      <app-update-prompt />
    </div>
  `,
})
export class AppComponent implements OnInit {
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.initialize();
  }
}
