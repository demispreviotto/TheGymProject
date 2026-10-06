# 6. Testing Strategy

[Back to index](./IMPROVEMENTS.md)

---

## Current State

There are **zero `.spec.ts` files** in the project. No unit tests, no integration tests, no E2E tests. The app has been validated manually, but there's no automated safety net.

This is the single most impactful improvement to make before the production deploy of Phases 7+8.

---

## 1. Framework Setup

**Effort: 2 hours | Impact: Critical**

### Recommended Stack

| Layer | Tool | Why |
|-------|------|-----|
| Unit tests (services, utils) | **Vitest** | Fast, ESM-native, works with Angular signals out of the box |
| Component tests | **Angular Testing Library** | Renders real components with real change detection |
| E2E tests | **Playwright** | Full browser tests against your local Supabase stack |
| RLS policy tests | **pgTAP** or raw SQL | Verify that each role can only see what they should |

### Installation

```bash
# Unit + Component testing
pnpm add -D vitest @analogjs/vitest-angular jsdom
pnpm add -D @testing-library/angular @testing-library/jest-dom

# E2E testing
pnpm add -D playwright @playwright/test
npx playwright install  # downloads browser binaries
```

### Add Scripts to `package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

### Vitest Config

Create `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vitest-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
});
```

---

## 2. What to Test (Priority Order)

### 2.1 Tier 1 — Must Have Before Production Deploy

These tests protect the most critical paths. If any of these break silently, users get locked out or see wrong data.

#### `auth.service.spec.ts`

| Test Case | What It Verifies |
|-----------|-----------------|
| `signIn` with valid creds sets `profile` signal | Login actually works |
| `signIn` with wrong password returns error string | Error path doesn't crash |
| `loadProfile` populates `profile` and `tenant` signals | Profile hydration works |
| `signOut` clears signals and navigates to `/login` | Logout is clean |
| `redirectByRole('trainer')` goes to `/trainer` | Role routing works |
| `redirectByRole('admin')` goes to `/admin` | Admin routing works |
| `redirectByRole('free')` goes to `/dashboard` | Default routing works |

#### `role.guard.spec.ts`

| Test Case | What It Verifies |
|-----------|-----------------|
| `authGuard` allows authenticated user | Basic auth works |
| `authGuard` redirects unauthenticated to `/login` | Unauthenticated blocked |
| `roleGuard(['trainer'])` allows trainer | Role check works |
| `roleGuard(['trainer'])` blocks free user | Wrong role blocked |
| `roleGuard(['admin'])` blocks trainer | Admin-only enforced |

#### `workout.service.spec.ts`

| Test Case | What It Verifies |
|-----------|-----------------|
| `computeSuggestedWeight` with history returns correct Epley result | Math is right |
| `computeSuggestedWeight` with no history returns fallback | Fallback works |
| `resolveActiveDay` wraps from last day to first | Day cycling works |
| `resolveActiveDay` increments to next day | Normal progression |

These are pure functions — they don't need Supabase mocking. Easiest tests to write.

#### RLS Integration Tests

These run SQL directly against your local Supabase database:

```sql
-- Test: user can only read own workout sessions
BEGIN;
  SET LOCAL role TO 'authenticated';
  SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';

  -- This should return rows
  SELECT count(*) FROM workout_sessions
    WHERE user_id = 'user-uuid-here';
  -- Assert: count > 0

  -- This should return 0 rows
  SELECT count(*) FROM workout_sessions
    WHERE user_id = 'other-user-uuid';
  -- Assert: count = 0
ROLLBACK;
```

```sql
-- Test: free user can only see own exercises
BEGIN;
  SET LOCAL role TO 'authenticated';
  SET LOCAL request.jwt.claims TO '{"sub": "free-user-uuid"}';

  -- Should see own exercises
  SELECT count(*) FROM exercises WHERE tenant_id = 'free-user-uuid';
  -- Assert: count > 0

  -- Should see global exercises (tenant_id IS NULL)
  SELECT count(*) FROM exercises WHERE tenant_id IS NULL;
  -- Assert: count > 0

  -- Should NOT see another tenant's exercises
  SELECT count(*) FROM exercises WHERE tenant_id = 'trainer-uuid';
  -- Assert: count = 0
ROLLBACK;
```

### 2.2 Tier 2 — Should Have

| Test File | What It Covers |
|-----------|---------------|
| `planning.service.spec.ts` | Create, update (with days), delete, cascading deletes |
| `friendship.service.spec.ts` | Send request, accept, reject, cancel; computed lists update |
| `invite-request.service.spec.ts` | Submit request, approve, reject; remaining invite count |
| `language.service.spec.ts` | Persist preference to DB, `initFromProfile` sets signal |
| `exercise.service.spec.ts` | CRUD operations, tenant scoping |

### 2.3 Tier 3 — Nice to Have

These are E2E tests using Playwright against the full local stack:

| Test | Flow |
|------|------|
| Trainer invites client | Login as trainer → Clients page → Invite → Check Mailpit → Accept invite |
| Complete workout session | Login as user → Dashboard → Fill inputs → Finish → Verify session saved |
| Friend sharing | Login as free → Friends → Send request → Accept (other user) → View shared plan |

### Setup for E2E

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4200',
  },
  webServer: {
    command: 'pnpm start',
    port: 4200,
    reuseExistingServer: true,
  },
});
```

---

## 3. Test File Naming Convention

```
src/
  core/
    auth/
      auth.service.ts
      auth.service.spec.ts       <-- co-located with source
    workout/
      workout.service.ts
      workout.service.spec.ts
  features/
    client/
      workout-dashboard/
        workout-dashboard.component.ts
        workout-dashboard.component.spec.ts
e2e/
  invite-flow.spec.ts            <-- E2E tests in separate directory
  workout-session.spec.ts
  friend-sharing.spec.ts
```

Co-locate unit/component tests with their source files. E2E tests get their own `e2e/` directory.

---

## 4. When to Write Tests

For new code going forward:
- Service methods with business logic (calculations, state transitions): always write a test
- Guard changes: always write a test
- New RLS policies: always write an RLS integration test
- Component tests: write when the component has significant conditional logic

For existing code:
- Start with Tier 1 (above). These are the most critical and the easiest to write.
- Add Tier 2 tests as you touch those services for other reasons.
