import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);

  readonly updateReady = toSignal(
    this.swUpdate.versionUpdates.pipe(
      filter((event) => event.type === 'VERSION_READY'),
      map(() => true),
    ),
    { initialValue: false },
  );

  async applyUpdate(): Promise<void> {
    await this.swUpdate.activateUpdate();
    document.location.reload();
  }
}
