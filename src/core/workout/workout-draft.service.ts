import { DOCUMENT, inject, Injectable } from '@angular/core';
import {
  DRAFT_KEY_PREFIX, isDraftStale, parseDraft, type WorkoutDraft,
} from './workout-draft';

/**
 * Keeps the workout in progress in localStorage so it survives leaving the page, a reload or
 * closing the app. Every call is safe when storage is blocked or full (private mode, quota):
 * the workout then simply behaves as it did before drafts existed.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutDraftService {
  private readonly doc = inject(DOCUMENT);

  /** The saved draft, or null when there is none, it is stale or it is unreadable (stale ones are removed). */
  load(key: string, now: number = Date.now()): WorkoutDraft | null {
    const store = this.storage();
    if (store === null) return null;

    const draft = this.read(store, key);
    if (draft === null) return null;
    if (isDraftStale(draft, now)) {
      this.remove(store, key);
      return null;
    }
    return draft;
  }

  save(key: string, draft: WorkoutDraft): void {
    try {
      this.storage()?.setItem(key, JSON.stringify(draft));
    } catch {
      // Quota exceeded or storage blocked: progress just is not kept across pages.
    }
  }

  clear(key: string): void {
    const store = this.storage();
    if (store !== null) this.remove(store, key);
  }

  /** Removes every draft that is stale or unreadable, so abandoned workouts do not pile up. */
  pruneStale(now: number = Date.now()): void {
    const store = this.storage();
    if (store === null) return;

    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key !== null && key.startsWith(DRAFT_KEY_PREFIX)) keys.push(key);
    }
    for (const key of keys) {
      const draft = this.read(store, key);
      if (draft === null || isDraftStale(draft, now)) this.remove(store, key);
    }
  }

  private storage(): Storage | null {
    try {
      return this.doc.defaultView?.localStorage ?? null;
    } catch {
      return null; // Accessing localStorage itself can throw when site data is blocked.
    }
  }

  private read(store: Storage, key: string): WorkoutDraft | null {
    try {
      return parseDraft(store.getItem(key));
    } catch {
      return null;
    }
  }

  private remove(store: Storage, key: string): void {
    try {
      store.removeItem(key);
    } catch {
      // Nothing useful to do if storage refuses a delete.
    }
  }
}
