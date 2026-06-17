# 2. Code Quality & Architecture

[Back to index](./IMPROVEMENTS.md)

---

## What's Good Already

- Every component uses `ChangeDetectionStrategy.OnPush` and standalone architecture
- Signal-based reactivity throughout, with no `effect()` anti-patterns
- Clean `core/` / `features/` / `shared/` separation with zero cross-feature imports
- All routes lazy-loaded via `loadComponent()` with dynamic imports

This doc covers the gaps worth closing.

---

## 1. Add Supabase Type Generation

**Effort: 30 min | Impact: High**

### The Problem

Every Supabase query result is cast with `as Planning[]`, `as Profile[]`, etc. If the database schema changes (new column, renamed field, type change), TypeScript won't catch the mismatch — you'll get runtime errors instead of compile errors.

Example of the current pattern (appears in every service):
```typescript
// src/core/planning/planning.service.ts
const { data } = await this.supabase.from('plannings').select('*');
this.plannings.set((data as Planning[]) ?? []);
//                  ^^^^^^^^^^^^^^^^ unsafe cast
```

### The Fix

Supabase CLI can generate TypeScript types directly from your local database:

```bash
# Add this script to package.json
"db:types": "pnpm exec supabase gen types typescript --local > src/core/supabase/database.types.ts"
```

Then update the Supabase client to use the generated types:

```typescript
// src/core/supabase/supabase.client.ts — before
import { createClient } from '@supabase/supabase-js';
export const SUPABASE_CLIENT = new InjectionToken('...');

// after
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// The generic parameter gives you type-safe .from() calls
const client = createClient<Database>(url, key);
```

Now you can remove all the `as Planning[]` casts — TypeScript knows the shape from the generated types.

### Files to Change

- `src/core/supabase/supabase.client.ts` — add `Database` generic
- Every service file — remove `as` casts on Supabase responses
- `package.json` — add the `db:types` script

### When to Regenerate

Run `pnpm db:types` every time you create a new migration and run `pnpm supabase:reset`.

---

## 2. Remove the Legacy Client Shell

**Effort: 5 min | Impact: Low**

`src/features/client/client-shell/client-shell.component.ts` is described in CLAUDE.md as "unused — legacy stub". It has no route pointing to it and no imports referencing it.

Just delete it. One less file to confuse future readers.

---

## 3. Fix the Global UID Counter

**Effort: 10 min | Impact: Low**

### The Problem

`src/features/trainer/planning/planning-form/planning-form.component.ts` uses a module-level counter for generating temporary IDs:

```typescript
let _uid = 0;
const nextUid = () => ++_uid;
```

This counter lives at the module level, so it persists across route navigations. If a user navigates away from the planning form and comes back, the counter keeps incrementing from where it left off. This isn't a bug today, but it could cause subtle issues if these IDs are ever compared across sessions.

### The Fix

```typescript
const nextUid = () => crypto.randomUUID();
```

`crypto.randomUUID()` is available in all modern browsers and gives truly unique IDs with zero state.

---

## 4. Add Barrel Exports for Core Services

**Effort: 15 min | Impact: Low (developer ergonomics)**

### The Problem

Feature components have long import paths:

```typescript
import { AuthService } from '../core/auth/auth.service';
import { PlanningService } from '../core/planning/planning.service';
import { ExerciseService } from '../core/exercises/exercise.service';
```

### The Fix

Create `src/core/index.ts`:

```typescript
export { AuthService } from './auth/auth.service';
export { PlanningService } from './planning/planning.service';
export { ExerciseService } from './exercises/exercise.service';
export { WorkoutService } from './workout/workout.service';
export { FriendshipService } from './friendships/friendship.service';
export { LanguageService } from './i18n/language.service';
export { TenantService } from './tenant/tenant.service';
export { InviteRequestService } from './invite-requests/invite-request.service';
export { CountdownTimerService } from './timer/countdown-timer.service';
export { ThemeService } from './theme/theme.service';
```

Then imports become:

```typescript
import { AuthService, PlanningService, ExerciseService } from '../core';
```

---

## 5. i18n Minor Improvements

### 5a. Add Missing Translation Key Detection

**Effort: 30 min | Impact: Medium**

When a translation key is missing, the pipe silently returns the raw key string. In dev mode, it should warn:

```typescript
// src/core/i18n/i18n.dictionary.ts
export function translate(key: string, lang: Language): string {
  const entry = DICTIONARY[key];
  if (!entry) {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.warn(`[i18n] Missing translation key: "${key}"`);
    }
    return key;
  }
  return entry[lang];
}
```

This way, missing keys are immediately visible in the browser console during development, but don't noise up production.

### 5b. Add Language Type Guard

```typescript
// Make the Language type extensible
const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
type Language = (typeof SUPPORTED_LANGUAGES)[number];

export function isLanguage(v: string): v is Language {
  return SUPPORTED_LANGUAGES.includes(v as Language);
}
```

### 5c. TranslatePipe Performance Note

The `| translate` pipe is `pure: false`, meaning it re-evaluates on every change detection cycle. This is fine for most pages, but in loops rendering 50+ items, prefer injecting `LanguageService` and using `computed()` signals directly:

```typescript
// Instead of {{ 'key' | translate }} in a heavy loop:
readonly label = computed(() => this.lang.t('key'));
// Template: {{ label() }}
```
