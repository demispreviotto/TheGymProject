import { Injectable, InjectionToken, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';
import { withTimeout } from './with-timeout';

/** How an update check made while the splash is showing ended. */
export type LaunchUpdateResult =
  | 'unavailable' // no service worker to ask (dev build, unsupported browser, first visit)
  | 'up-to-date'
  | 'applied' // new version activated and the page is reloading into it
  | 'ready' // new version downloaded but not applied: the update prompt takes over
  | 'timeout'; // offline or slow: the app starts on the version it already has

/** Time to learn whether a newer version exists. Offline checks answer much sooner. */
export const DETECT_TIMEOUT_MS = 3_000;
/** Extra time to download a newer version once one has been detected. */
export const DOWNLOAD_TIMEOUT_MS = 8_000;
/** Within this window after an automatic update, a second one is left to the prompt. */
const AUTO_APPLY_GUARD_MS = 60_000;
const AUTO_APPLY_KEY = 'pwa.update.auto-applied-at';

export const RELOAD_PAGE = new InjectionToken<() => void>('RELOAD_PAGE', {
  providedIn: 'root',
  factory: () => () => document.location.reload(),
});

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly reload = inject(RELOAD_PAGE);

  readonly updateReady = toSignal(
    this.swUpdate.versionUpdates.pipe(
      filter((event) => event.type === 'VERSION_READY'),
      map(() => true),
    ),
    { initialValue: false },
  );

  /** A newer version was found and is being downloaded (until it is ready or fails). */
  readonly downloading = toSignal(
    this.swUpdate.versionUpdates.pipe(map((event) => event.type === 'VERSION_DETECTED')),
    { initialValue: false },
  );

  async applyUpdate(): Promise<void> {
    await this.swUpdate.activateUpdate();
    this.reload();
  }

  /**
   * Asks the service worker for a newer version while the splash is still up, and applies
   * it before the user starts using the app. Never rejects and never waits long: offline or
   * slow, it gives up and the app starts on the version it already has.
   */
  async checkOnLaunch(): Promise<LaunchUpdateResult> {
    // A page with no controller was just fetched from the network, so it is the latest.
    if (!this.swUpdate.isEnabled || !navigator.serviceWorker?.controller) return 'unavailable';

    const check = this.swUpdate.checkForUpdate().catch(() => false);
    let outcome = await withTimeout(check, DETECT_TIMEOUT_MS);
    if (outcome.timedOut && this.downloading()) {
      outcome = await withTimeout(check, DOWNLOAD_TIMEOUT_MS);
    }
    if (outcome.timedOut) return 'timeout';
    // The worker's own navigation check may have fetched the update before ours ran.
    if (!outcome.value && !this.updateReady()) return 'up-to-date';
    return this.applyOnLaunch();
  }

  private async applyOnLaunch(): Promise<LaunchUpdateResult> {
    // An auth callback in the URL hash must not be interrupted by a reload.
    if (location.hash || this.appliedRecently()) return 'ready';
    try {
      if (!(await this.swUpdate.activateUpdate())) return 'ready';
    } catch {
      return 'ready';
    }
    this.rememberApplied();
    this.reload();
    return 'applied';
  }

  // Stops a reload loop if the activated version somehow keeps reporting a newer one.
  private appliedRecently(): boolean {
    try {
      const at = Number(sessionStorage.getItem(AUTO_APPLY_KEY));
      return at > 0 && Date.now() - at < AUTO_APPLY_GUARD_MS;
    } catch {
      return false;
    }
  }

  private rememberApplied(): void {
    try {
      sessionStorage.setItem(AUTO_APPLY_KEY, String(Date.now()));
    } catch {
      /* storage blocked: the loop guard is best-effort */
    }
  }
}
