import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { AppLaunchService, AUTH_TIMEOUT_MS } from './app-launch.service';
import { PwaUpdateService, type LaunchUpdateResult } from './pwa-update.service';

describe('AppLaunchService', () => {
  let isLoading: ReturnType<typeof signal<boolean>>;
  let checkOnLaunch: Mock;

  function createService(): AppLaunchService {
    return TestBed.inject(AppLaunchService);
  }

  // Lets the toObservable bridge and the pending promises run.
  async function flush(): Promise<void> {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(0);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    isLoading = signal(true);
    checkOnLaunch = vi.fn().mockResolvedValue('up-to-date' satisfies LaunchUpdateResult);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isLoading } },
        { provide: PwaUpdateService, useValue: { checkOnLaunch, downloading: signal(false) } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('shows the splash until the app is started', () => {
    expect(createService().splashVisible()).toBe(true);
  });

  it('checks for an update as soon as it starts', async () => {
    const service = createService();
    void service.start();
    await flush();
    expect(checkOnLaunch).toHaveBeenCalledOnce();
  });

  it('only starts once', async () => {
    const service = createService();
    void service.start();
    void service.start();
    await flush();
    expect(checkOnLaunch).toHaveBeenCalledOnce();
  });

  it('hides the splash once the session is restored and the update check is done', async () => {
    const service = createService();
    void service.start();
    isLoading.set(false);
    await flush();
    expect(service.splashVisible()).toBe(false);
  });

  it('keeps the splash while the profile is still loading', async () => {
    const service = createService();
    void service.start();
    await flush();
    expect(service.splashVisible()).toBe(true);
  });

  it('keeps the splash while the update check is pending', async () => {
    checkOnLaunch.mockReturnValue(new Promise(() => undefined));
    const service = createService();
    void service.start();
    isLoading.set(false);
    await flush();
    expect(service.splashVisible()).toBe(true);
  });

  it('does not hang on a session restore that never finishes', async () => {
    const service = createService();
    void service.start();
    await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS);
    expect(service.splashVisible()).toBe(false);
  });

  it('keeps the splash up while the page reloads into a new version', async () => {
    checkOnLaunch.mockResolvedValue('applied' satisfies LaunchUpdateResult);
    const service = createService();
    void service.start();
    isLoading.set(false);
    await flush();
    expect(service.splashVisible()).toBe(true);
  });

  it('hides the splash even if the update check throws', async () => {
    checkOnLaunch.mockRejectedValue(new Error('boom'));
    const service = createService();
    void service.start();
    isLoading.set(false);
    await flush();
    expect(service.splashVisible()).toBe(false);
  });
});
