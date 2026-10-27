import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import type { Mock } from 'vitest';
import {
  DETECT_TIMEOUT_MS,
  DOWNLOAD_TIMEOUT_MS,
  PwaUpdateService,
  RELOAD_PAGE,
} from './pwa-update.service';

const version = { hash: 'abc' };
const detected = { type: 'VERSION_DETECTED', version } as VersionEvent;
const ready = { type: 'VERSION_READY', currentVersion: version, latestVersion: version } as VersionEvent;

describe('PwaUpdateService', () => {
  let events: Subject<VersionEvent>;
  let swUpdate: { isEnabled: boolean; versionUpdates: Subject<VersionEvent>; checkForUpdate: Mock; activateUpdate: Mock };
  let reload: Mock;
  let hadServiceWorker: boolean;
  let originalServiceWorker: PropertyDescriptor | undefined;

  function setController(controller: object | null): void {
    Object.defineProperty(navigator, 'serviceWorker', { value: { controller }, configurable: true });
  }

  function createService(): PwaUpdateService {
    return TestBed.inject(PwaUpdateService);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    window.location.hash = '';
    hadServiceWorker = 'serviceWorker' in navigator;
    originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
    setController({});

    events = new Subject<VersionEvent>();
    reload = vi.fn();
    swUpdate = {
      isEnabled: true,
      versionUpdates: events,
      checkForUpdate: vi.fn().mockResolvedValue(false),
      activateUpdate: vi.fn().mockResolvedValue(true),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: swUpdate },
        { provide: RELOAD_PAGE, useValue: reload },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalServiceWorker) Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
    else if (!hadServiceWorker) delete (navigator as unknown as Record<string, unknown>)['serviceWorker'];
  });

  describe('signals', () => {
    it('updateReady turns true on VERSION_READY', () => {
      const service = createService();
      expect(service.updateReady()).toBe(false);
      events.next(ready);
      expect(service.updateReady()).toBe(true);
    });

    it('downloading is true from VERSION_DETECTED until the version is ready', () => {
      const service = createService();
      events.next(detected);
      expect(service.downloading()).toBe(true);
      events.next(ready);
      expect(service.downloading()).toBe(false);
    });
  });

  it('applyUpdate activates the new version and reloads', async () => {
    await createService().applyUpdate();
    expect(swUpdate.activateUpdate).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  describe('checkOnLaunch', () => {
    it('does nothing when the service worker is disabled', async () => {
      swUpdate.isEnabled = false;
      await expect(createService().checkOnLaunch()).resolves.toBe('unavailable');
      expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
    });

    it('does nothing on a page the service worker does not control yet', async () => {
      setController(null);
      await expect(createService().checkOnLaunch()).resolves.toBe('unavailable');
      expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
    });

    it('reports up-to-date when there is no newer version', async () => {
      await expect(createService().checkOnLaunch()).resolves.toBe('up-to-date');
      expect(reload).not.toHaveBeenCalled();
    });

    it('treats a failing check as up-to-date', async () => {
      swUpdate.checkForUpdate.mockRejectedValue(new Error('offline'));
      await expect(createService().checkOnLaunch()).resolves.toBe('up-to-date');
    });

    it('activates a newer version and reloads before the app starts', async () => {
      swUpdate.checkForUpdate.mockResolvedValue(true);
      await expect(createService().checkOnLaunch()).resolves.toBe('applied');
      expect(swUpdate.activateUpdate).toHaveBeenCalledOnce();
      expect(reload).toHaveBeenCalledOnce();
    });

    it('applies a version the worker already fetched on its own navigation check', async () => {
      const service = createService();
      events.next(ready);
      await expect(service.checkOnLaunch()).resolves.toBe('applied');
    });

    it('gives up after the detect timeout when the check hangs', async () => {
      swUpdate.checkForUpdate.mockReturnValue(new Promise(() => undefined));
      const result = createService().checkOnLaunch();
      await vi.advanceTimersByTimeAsync(DETECT_TIMEOUT_MS);
      await expect(result).resolves.toBe('timeout');
      expect(reload).not.toHaveBeenCalled();
    });

    it('waits longer for the download once a newer version was detected', async () => {
      let finish!: (found: boolean) => void;
      swUpdate.checkForUpdate.mockReturnValue(new Promise<boolean>((resolve) => (finish = resolve)));
      const service = createService();
      const result = service.checkOnLaunch();

      events.next(detected);
      await vi.advanceTimersByTimeAsync(DETECT_TIMEOUT_MS + 2000);
      finish(true);
      await expect(result).resolves.toBe('applied');
    });

    it('gives up when the download takes longer than the download timeout', async () => {
      swUpdate.checkForUpdate.mockReturnValue(new Promise(() => undefined));
      const result = createService().checkOnLaunch();
      events.next(detected);
      await vi.advanceTimersByTimeAsync(DETECT_TIMEOUT_MS + DOWNLOAD_TIMEOUT_MS);
      await expect(result).resolves.toBe('timeout');
    });

    it('leaves the update to the prompt when the URL carries an auth callback', async () => {
      window.location.hash = '#access_token=x&type=invite';
      swUpdate.checkForUpdate.mockResolvedValue(true);
      await expect(createService().checkOnLaunch()).resolves.toBe('ready');
      expect(reload).not.toHaveBeenCalled();
    });

    it('does not auto-apply twice in a row (reload loop guard)', async () => {
      swUpdate.checkForUpdate.mockResolvedValue(true);
      await createService().checkOnLaunch();
      reload.mockClear();
      await expect(createService().checkOnLaunch()).resolves.toBe('ready');
      expect(reload).not.toHaveBeenCalled();
    });

    it('falls back to the prompt when activation fails', async () => {
      swUpdate.checkForUpdate.mockResolvedValue(true);
      swUpdate.activateUpdate.mockRejectedValue(new Error('no'));
      await expect(createService().checkOnLaunch()).resolves.toBe('ready');
      expect(reload).not.toHaveBeenCalled();
    });

    it('falls back to the prompt when there was nothing to activate', async () => {
      swUpdate.checkForUpdate.mockResolvedValue(true);
      swUpdate.activateUpdate.mockResolvedValue(false);
      await expect(createService().checkOnLaunch()).resolves.toBe('ready');
      expect(reload).not.toHaveBeenCalled();
    });
  });
});
