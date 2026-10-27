import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { PwaUpdateService } from './pwa-update.service';
import { withTimeout } from './with-timeout';

/** The splash never outlives this, even if the session restore hangs. */
export const AUTH_TIMEOUT_MS = 5_000;

/**
 * What happens while the splash is showing: the session is restored and the profile loaded
 * (AuthService) while the service worker is asked for a newer version (PwaUpdateService).
 * The splash goes away once both are done, so an update is offered or applied before the
 * user starts using the app.
 */
@Injectable({ providedIn: 'root' })
export class AppLaunchService {
  private readonly auth = inject(AuthService);
  private readonly pwa = inject(PwaUpdateService);
  private readonly injector = inject(Injector);

  private readonly settled = signal(false);
  private started = false;

  readonly splashVisible = computed(() => !this.settled());
  /** A newer version is being downloaded: the splash says so. */
  readonly updating = this.pwa.downloading;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const authReady = firstValueFrom(
      toObservable(this.auth.isLoading, { injector: this.injector }).pipe(filter((loading) => !loading)),
    );
    const [, update] = await Promise.all([
      withTimeout(authReady, AUTH_TIMEOUT_MS),
      this.pwa.checkOnLaunch().catch(() => 'unavailable' as const),
    ]);
    // The page is reloading into the new version: keep the splash up until it does.
    if (update !== 'applied') this.settled.set(true);
  }
}
