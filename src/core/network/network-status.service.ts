import { Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, map, merge } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  readonly online = toSignal(
    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false)),
    ),
    { initialValue: navigator.onLine },
  );
}
