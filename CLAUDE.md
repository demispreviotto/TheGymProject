# claude.md: Project Blueprint & System Architecture

This file serves as the definitive single source of truth for the Gym Planificación web application. All code generated must comply with the patterns, constraints, and architecture outlined below.

---

## Current Development State

**Active Phase:** Phases 1–8.1 are complete and live. PWA support, push notifications and the Vitest unit-test suite are also in place. Phase 9 (Corporate Gym tier) is conceptual/unscheduled.

| Phase | Status | Summary |
|-------|--------|---------|
| 1 — Infrastructure | ✅ Done | Supabase CLI, SQL schema + RLS migrations, seed data |
| 2 — Angular Scaffold | ✅ Done | Auth, ThemeService, async roleGuard/authGuard, LoginComponent |
| 3 — Mobile Workout Engine | ✅ Done | WorkoutService + WorkoutDashboardComponent: Epley 1RM, adaptive inputs, session drawer |
| 4 — Trainer Admin Dashboard | ✅ Done | Exercise & Planning CRUD, ExerciseEditSheetComponent, ClientRosterComponent + ClientDetailSheetComponent |
| 5 — Shell, Workout Engine, Client Portal | ✅ Done | AppShellComponent (universal layout), all routes wired, ProfilePageComponent |
| 6 — Multi-Tenant Onboarding, Protocols & Localization | ✅ Done | LanguageService + translate pipe (EN/ES), tenants table + TenantService, editable trainer branding, protocol link sharing |
| 7 — Invitation & Access Control | ✅ Done | RegisterComponent, trainer invites, admin portal, free-user invite requests, `invite_requests` table, `admin` role |
| 8 — Free User Self-Service Planning + Friend Sharing | ✅ Done | Free/admin/trainer create own exercises & plans, friend request system, `is_shared_with_friends`, `/my-plan/*` routes; shared plans viewable read-only by friends; `/dashboard` open to all roles |
| 8.1 — Rest Timer Component | ✅ Done | `CountdownTimerService` singleton + `CountdownTimerComponent` (fullscreen ↔ toast); timer button per exercise card; blinking last 5 s; auto-dismiss on zero; screen wake lock while running; keeps running across page changes (the toast stays visible) and is cancelled only when the shell is destroyed, i.e. on sign-out |
| PWA + Push | ✅ Done | Installable manifest, service worker (`ngsw-config.json`), update prompt, offline banner, iOS splash screens, Web Push for friend requests and invite decisions |
| Tests | ✅ Done | Vitest (via Angular's `@angular/build:unit-test` builder, jsdom): `pnpm test` (watch) · `pnpm test:ci` (single run). Use `vi.fn()` and `vi.useFakeTimers()` — zone.js `fakeAsync` does not work under Vitest. Specs live next to the code as `*.spec.ts`; shared Supabase mock in `src/testing/supabase-mock.ts` |

**Branches:** `main` is production and `dev` is the integration branch. Both are protected by GitHub rulesets: PR-only, no force-push or deletion, and the CI jobs **Build & test** and **Migrations** must pass before a merge (`main` also needs 1 approval; the repo admin can bypass it on PRs, `dev` has no bypass). Only merge commits are allowed, and merged head branches are deleted automatically.

**Flow:** branch off `dev` (`feat/*`, `fix/*`, `chore/*`, `docs/*`) → PR into `dev` → release PR `dev` → `main` ("Release: promote dev to main"). A merge to `main` deploys the frontend to Vercel; it does **not** run migrations. Database migrations and edge functions are deployed separately by hand, before the release merge when it contains migrations (see Hard Stops).

**CI** (`.github/workflows/ci.yml`, on PRs to `dev`/`main`): production build, `pnpm check:csp`, `pnpm test:ci`, and a job that applies every migration to a fresh local Supabase stack. The repo only allows GitHub Actions pinned to a full commit SHA, so pin any new action (and keep the `# vX` comment). `scripts/generate-env.mjs` fails the build in CI/Vercel when `SUPABASE_URL` or `SUPABASE_ANON_KEY` is missing.

**Local dev ports:** Kong API `54321` · DB `54322` · Studio `54323` · Mailpit `54324`

**Start dev:** `pnpm exec supabase start` → `pnpm start`

---

## 0. Critical Execution Constraints & Environment

### Production Safety — HARD STOPS
These actions affect the live production environment and **must never be executed without explicit user confirmation in the same conversation turn:**

| Command | Risk |
|---------|------|
| `supabase db push` | Applies pending migrations to production Supabase — irreversible schema changes |
| `supabase functions deploy` | Overwrites live edge functions (e.g. `invite-client`) |
| `vercel --prod` / `vercel deploy --prod` | Deploys frontend build to production Vercel project |
| Any `supabase db execute` or raw SQL against production | Direct production DB mutation |

**Deployment state is not recorded in this file.** Before assuming anything is or isn't in production, check the source of truth: `supabase migration list`, `supabase functions list`, and `git log origin/main`. Never run the production commands above automatically — coordinate with the user before each one.

Before running any production command, state clearly: _"This will affect production. Confirm?"_ and wait for an affirmative reply.

### Package Management
- **Mandatory Tooling:** You MUST use `pnpm` for all package management actions. Never generate a `package-lock.json` or `yarn.lock`. All commands must use `pnpm add`, `pnpm dev`, etc.

### Structural Rigidity & File Safeguards
- **No Rogue Refactoring:** Do not modify or refactor any structural configuration files (`angular.json`, `tailwind.config.js`, `tsconfig.json`) unless explicitly instructed to do so by the user.
- **Incremental Code Updates:** When updating code blocks, provide the exact modified methods or files. Never output placeholder summaries (e.g., `// ... rest of code here`) inside structural files, as this destroys context.
- **Folder Convention:** Adhere strictly to the established directory blueprint:
  - `core/`: Global singletons, auth states, database client instances, theme controllers.
  - `features/`: Isolated layout views split clearly into desktop-centric administrative code vs mobile-centric tracking engines.
  - `shared/`: Dumb UI primitives, utility pipes, and stateless helpers.

## 1. Technical Stack Overview
- **Frontend Framework:** Angular 20 (Standalone Components, Signal-based reactivity)
- **Tooling:** Angular Application Builder (esbuild for production, Vite for internal development server)
- **UI Architecture:** Tailwind CSS + Spartan UI (Radix primitives for Angular)
- **Backend/Database:** Supabase (PostgreSQL with Row-Level Security)
- **Hosting/Deployment:** Vercel (Edge network deployment)
- **Target Audience UX:** Client Workout Dashboard is strictly **Mobile-First**. Trainer Administrative Portals are **Desktop-First**.

---

## 2. Coding Standards & Architectural Philosophies

### SOLID & DRY Principles
- **Single Responsibility:** Separate components (presentation/view templates), services (state containers and data fetching), and utilities (pure functions like math calculations).
- **Dependency Injection:** Components must inject abstract services (`inject(TaskService)`) rather than instantiate clients or hold raw asynchronous fetching logic.

### State Management: The No-Effect Rule
- **Zero Scrambled State:** Never use Angular's `effect()` or stateful lifecycle hooks to synchronize or mutate state slices when a user acts.
- **Derived State:** All dependent UI properties must be computed cleanly using declarative `computed()` signals. State flows unidirectionally from the database/service signal store down to the view template.
- **RxJS Boundary:** Use RxJS Observables exclusively for asynchronous event streams (Supabase real-time subscriptions, HTTP polling). Convert to Signals instantly at the service boundary using `toSignal()`.

### Software Safety: Adaptation of NASA's Power of 10 Rules
1. **Simple Control Flow:** Avoid complex nested conditionals or recursive component rendering tree structures.
2. **Fixed Scopes:** Functions must complete a single objective. Keep function lengths short (ideally under 60 lines of code).
3. **Data Scope Isolation:** Components must never directly mutate state arrays owned by services. They invoke descriptive service methods.
4. **Strict Pointer/Type Hygiene:** No usage of `any`. Every object, table record, configuration parameter, and multi-tenant payload must have a strict TypeScript `interface` or `type` definition.
5. **Strict Compilation Checks:** Code must strictly pass standard TypeScript compiler configurations (`strict: true`).

### Database Evolution: Expand/Contract Strategy
- To handle schema upgrades without breaking the active frontend deployment, database modifications must utilize the **Expand/Contract pattern**:
  - **Expand:** Add new columns or tables alongside existing structures, supporting fallback logic within your services.
  - **Contract:** Once the code deprecates old fields across all releases, drop the legacy elements safely via migration scripts.

---

## 3. Database Schema (Supabase PostgreSQL)

```sql
-- ENUMS & UTILITIES
CREATE TYPE user_role AS ENUM ('trainer', 'user', 'free');
CREATE TYPE muscle_intensity AS ENUM ('primary', 'secondary', 'tertiary');
CREATE TYPE tracking_mode AS ENUM ('standard', 'granular', 'failure');

-- PROFILES (Extends Supabase Auth Metadata)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'free',
  tenant_id UUID REFERENCES auth.users(id) NULL,
  tenant_name TEXT NULL,
  tenant_logo_svg TEXT NULL,
  tenant_primary_hex VARCHAR(7) DEFAULT '#EF4444' NOT NULL,
  assigned_planning_id UUID REFERENCES plannings(id) NULL, -- migration 20260524000004
  is_active BOOLEAN DEFAULT TRUE NOT NULL,                 -- migration 20260526000005
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_svg_size CHECK (octet_length(tenant_logo_svg) <= 65535)
);

-- EXERCISES
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) NULL, -- NULL indicates global system defaults
  name TEXT NOT NULL,
  definition TEXT,
  recommendations TEXT,
  muscle_groups JSONB NOT NULL DEFAULT '[]'::jsonb, -- Schema: { name: string, intensity: muscle_intensity }[]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLANNING
CREATE TABLE plannings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  use_auto_1rm BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE planning_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  planning_id UUID REFERENCES plannings(id) ON DELETE CASCADE NOT NULL,
  day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  UNIQUE(planning_id, day_number)
);

CREATE TABLE prescribed_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  planning_day_id UUID REFERENCES planning_days(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  exigence CHAR(1) NOT NULL CHECK (exigence IN ('A', 'B', 'C', 'D')),
  rest_time_minutes NUMERIC(3,1) NOT NULL,
  tracking_mode tracking_mode NOT NULL DEFAULT 'standard',
  rounds INT NOT NULL,
  target_reps INT NOT NULL,
  suggested_first_weight NUMERIC(5,2),
  sorting_order INT NOT NULL
);

-- USER EXECUTION LOGS
CREATE TABLE workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  planning_id UUID REFERENCES plannings(id) NOT NULL,
  day_number INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  subjective_score INT CHECK (subjective_score BETWEEN 1 AND 5)
);

CREATE TABLE workout_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  round_number INT NOT NULL,
  weight_used NUMERIC(5,2) NOT NULL,
  reps_performed INT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE NOT NULL
);
```

### Phase 6 Schema (migration 20260530000006_phase6_schema.sql — ✅ applied)

```sql
-- NEW TABLE: isolates gym/team branding from auth.users
CREATE TABLE public.tenants (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  logo_svg    TEXT,
  primary_hex VARCHAR(7) DEFAULT '#EF4444' NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES additions (expand only — existing columns preserved)
ALTER TABLE public.profiles
  ADD COLUMN tenant_ref_id       UUID REFERENCES public.tenants(id),    -- branding FK to tenants
  ADD COLUMN preferred_language  VARCHAR(2) DEFAULT 'en' NOT NULL,      -- i18n: 'en' | 'es'
  ADD COLUMN assigned_trainer_id UUID REFERENCES public.profiles(id);   -- direct trainer link (Phase 7+)

-- NOTE: profiles.tenant_id still references auth.users(id) (trainer's user ID).
-- All existing RLS policies that compare tenant_id = auth.uid() remain valid.
-- The contract step (drop tenant_id, rename tenant_ref_id → tenant_id, rewrite RLS)
-- is deferred until Phase 7 once all code paths use tenant_ref_id.

-- PLANNINGS addition
ALTER TABLE public.plannings
  ADD COLUMN is_shared_with_gym BOOLEAN DEFAULT FALSE NOT NULL; -- enables protocol link sharing
```

### Phase 7 Schema (migrations 20260605*)

```sql
-- user_role enum gains 'admin'
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

-- New table: free-user invite requests pending admin approval
CREATE TABLE public.invite_requests (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id            UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invitee_email           TEXT NOT NULL,
  invitee_name            TEXT NOT NULL,
  reason                  TEXT NOT NULL,
  accepted_responsibility BOOLEAN NOT NULL DEFAULT FALSE,
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_id             UUID REFERENCES public.profiles(id),
  reviewer_note           TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at             TIMESTAMPTZ
);
-- RLS: requester reads own; admin reads/updates all

-- handle_new_user trigger updated: reads raw_app_meta_data for role/tenant linkage;
-- trainer invites auto-create a tenants row so new trainers have branding from day 1.

-- New admin RLS policies on profiles:
--   "admin can read all profiles"   — TO authenticated USING (get_my_role() = 'admin')
--   "admin can update all profiles" — TO authenticated USING/WITH CHECK (get_my_role() = 'admin')
```

### Phase 8 Schema (migrations 20260605191428, 20260613114250, 20260614082904)

```sql
-- New RLS policies (all use get_my_role() IN ('free','admin') AND tenant_id = auth.uid())
-- Applied to: exercises, plannings, planning_days, prescribed_exercises

-- PLANNINGS addition
ALTER TABLE public.plannings
  ADD COLUMN is_shared_with_friends BOOLEAN DEFAULT FALSE NOT NULL;

-- Friendship connections between free/admin users
CREATE TABLE public.friendships (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);
-- RLS: both parties see their own rows; requester inserts; addressee updates; requester deletes
-- Extra SELECT policy on plannings: accepted friends can read is_shared_with_friends=true plans

-- 20260613114250: any authenticated user can read all profiles (friend name lookups)
CREATE POLICY "authenticated users can read all profiles"
ON public.profiles FOR SELECT TO authenticated USING (true);

-- 20260614082904: friends can read planning_days, prescribed_exercises, and exercises
-- referenced in plans where is_shared_with_friends = true
-- (three separate SELECT policies, one per table)
```

### Edge Functions (`supabase/functions/`)
| File | Purpose |
|------|---------|
| `invite-client/index.ts` | Trainer invites clients (role=user, tenant auto-set); admin invites anyone (role from body); rejects duplicate emails (checks `profiles.email`) and caps invites at 100 per tenant |
| `send-push/index.ts` | Web Push delivery. Called by the DB `send_push()` function with an `x-push-secret` header; sends to a user's `push_subscriptions` and prunes endpoints that return 404/410 |

---

## 4. Codebase File Map

All source lives under `src/`. Angular app root is `src/app/`.

### Migrations (`supabase/migrations/`)
| File | What it adds |
|------|-------------|
| `20260524000001_enums.sql` | `user_role`, `muscle_intensity`, `tracking_mode` enums |
| `20260524000002_tables.sql` | All core tables + `handle_new_user` trigger |
| `20260524000003_rls.sql` | Row-Level Security policies |
| `20260524000004_profiles_assigned_planning.sql` | `profiles.assigned_planning_id` |
| `20260526000005_profiles_is_active.sql` | `profiles.is_active` |
| `20260530000006_phase6_schema.sql` | `tenants` table; `profiles.tenant_ref_id`, `preferred_language`, `assigned_trainer_id`; `plannings.is_shared_with_gym` |
| `20260605174327_invite_trigger_update.sql` | `handle_new_user` reads `raw_app_meta_data`; trainer invite auto-creates `tenants` row |
| `20260605182335_add_admin_role.sql` | `'admin'` added to `user_role` enum |
| `20260605182337_invite_requests_table.sql` | `invite_requests` table + RLS; admin policies on `profiles` |
| `20260605191428_phase8_free_user_planning.sql` | RLS for free/admin on exercises + plannings + days + prescribed; `plannings.is_shared_with_friends`; `friendships` table + RLS |
| `20260612175053_invite_inactive_by_default.sql` | `handle_new_user` sets `is_active = false` for invited users until they complete `/register` |
| `20260613114250_friendship_profile_read_policy.sql` | `"authenticated users can read all profiles"` SELECT policy (`USING (true)`) — required for friend name lookups and invite-request requester display |
| `20260614082904_shared_plan_days_read.sql` | Friends can SELECT `planning_days`, `prescribed_exercises`, and `exercises` referenced in shared (`is_shared_with_friends = true`) plans |
| `20260921154818_performance_indexes.sql` | Indexes on `profiles.tenant_id`/`tenant_ref_id`, `plannings.tenant_id`, `workout_sessions(user_id, planning_id, completed_at)`, `friendships.requester_id`/`addressee_id`, `invite_requests.status` |
| `20260921160530_restrict_role_self_update.sql` | Replaces `"profiles: update own"` so a user can update their own row but not their own `role` column (blocks self-escalation via RLS) |
| `20261005120000_push_notifications.sql` | `push_subscriptions` table + RLS; `send_push()` (pg_net → `send-push` edge function, secrets in Vault); triggers `friendships_push` and `invite_requests_push` |

### Core (`src/core/`)
| File | Purpose |
|------|---------|
| `auth/auth.types.ts` | `UserRole` type + `Profile` interface (full column set including `assigned_planning_id`, `is_active`) |
| `auth/auth.service.ts` | Signal store: `profile`, `isLoading`. `signIn`, `signUp`, `signOut`, `loadProfile`, `redirectByRole`. `signIn`/`signUp` return a translated message for server/network failures instead of supabase-js's raw `{}` |
| `auth/auth-errors.ts` | `isServiceUnavailable(error)` — true for `AuthRetryableFetchError` or any 5xx; keeps raw gateway errors out of the UI |
| `guards/role.guard.ts` | `authGuard` (any authenticated user) + `roleGuard(roles[])` — both async via `toObservable(isLoading)` |
| `supabase/supabase.client.ts` | `SUPABASE_CLIENT` InjectionToken |
| `theme/theme.service.ts` | Hex→HSL conversion; injects `--tenant-*` CSS custom properties |
| `exercises/exercise.service.ts` | `exercises` signal; `load`, `create`, `update`, `delete` |
| `planning/planning.types.ts` | All domain types: `Exercise`, `Planning`, `PlanningDay`, `PrescribedExercise`, `WorkoutSession`, `WorkoutLog`, enums |
| `planning/planning.service.ts` | `plannings` signal; `loadPlannings`, `loadFull`, `create`, `update`, `delete`, `assignPlanning`, `loadTenantUsers`, `setShared`, `setSharedWithFriends`, `lookupSharedPlan` |
| `friendships/friendship.service.ts` | `friendships` signal; computed `friends`, `pendingReceived`, `pendingSent`; `load`, `sendRequest`, `accept`, `reject`, `cancel` |
| `i18n/i18n.dictionary.ts` | Full EN/ES translation dictionary (70+ keys); `translate(key, lang)` pure function |
| `i18n/language.service.ts` | `activeLanguage` signal; `initFromProfile`, `setLanguage` (persists to DB); `t(key)` helper |
| `tenant/tenant.service.ts` | `tenant` computed from `AuthService`; `update(patch)` — DB write + live theme propagation |
| `workout/workout.service.ts` | `loadPlan` (deep join with exercises), `loadLastSession`, `loadLastLog`, `saveSession`, `resolveActiveDay`, `computeSuggestedWeight` |
| `workout/workout-row.types.ts` | `WorkoutRowState` (one exercise of the active day: `inputs` + `roundsDone[]`, one flag per round; the exercise is completed when every round is done), `RoundInput`, `InputChange` |
| `workout/workout-stats.ts` | Pure dashboard helpers. Rows: `createRow` (inputs pre-filled with the suggested weight and target reps, so what is shown is what is saved), `initialInputs`, `roundCount`. Rounds: `isRowCompleted`, `completedRounds`, `currentRound`, `lastDoneRound`, `withRoundDone`. Totals: `completedCount`, `progressPercent`, `completedVolume` / `sessionVolume` (rounds done so far), `dayPosition` (index in the sorted day list, not the day number), `firstIncompleteId`, `topWeight`, `suggestionSource` |
| `workout/session-clock.ts` | `SessionClock`: elapsed workout time (`elapsedSeconds`, `startedAt`), started by the first user action (`start(from?)` can resume from a saved start), derived from the wall clock. Provided per dashboard (`providers: [SessionClock]`), not a root singleton; its interval is cleared on destroy |
| `workout/workout-draft.ts` | Pure draft logic for the workout in progress: `draftKey(user, plan, day)`, `toDraft`, `applyDraft` (overlays saved inputs/rounds only when the shape still matches the loaded plan), `parseDraft` (validates untrusted storage), `isDraftStale` (12 h) |
| `workout/workout-draft.service.ts` | `WorkoutDraftService` (root): `load` / `save` / `clear` / `pruneStale` over localStorage; every call is safe when storage is blocked or full. The dashboard saves after every change (`updateRow`), restores in `loadWorkout` and clears the draft once the session is saved, so progress survives leaving the page, a reload or closing the app |
| `invite-requests/invite-request.service.ts` | `myRequests` + `loadMyRequests` (free users); `approvedCount`/`remainingInvites` computed; `submitRequest`; `allRequests` + `loadAllRequests` (admin); `approveRequest`; `rejectRequest` |
| `timer/countdown-timer.service.ts` | Singleton rest timer: `secondsLeft`, `isFullscreen`, `isActive`, `isBlinking` signals; `start(seconds)`, `extend(seconds)` (the +30s button), `cancel()`, `toggle()`; one timer at a time; interval always cleared on cancel/complete |
| `push/push-notification.service.ts` | `isSupported`, `isSubscribed` signals; `enable()` requests a `SwPush` subscription (VAPID key in `push/push.config.ts`) and upserts it into `push_subscriptions` |
| `pwa/pwa-update.service.ts` | `updateReady` signal (service-worker `VERSION_READY`); `applyUpdate()` activates the new version and reloads |
| `network/network-status.service.ts` | `online` signal from `window` online/offline events |

### Features (`src/features/`)
| File | Route | Role |
|------|-------|------|
| `auth/login/login.component.ts` | `/login` | public |
| `shell/app-shell/app-shell.component.ts` | `/` (layout wrapper) | all authenticated — desktop sidebar + mobile top bar, bottom tab bar and "More" drawer, all driven by `navItemsForRole()`; `hasNotifications` (pending friend/invite requests) feeds the avatar dot |
| `shell/app-shell/nav-items.ts` | *(pure)* | `navItemsForRole(role)`: the role's pages in sidebar order; `inTabBar` marks the ≤4 that become bottom tabs, the rest live behind "More". `isMoreActive(items, url)`: true on a page that only lives behind "More", so that button is lit |
| `shell/bottom-tab-bar/bottom-tab-bar.component.ts` | *(shell, below `lg` only)* | all authenticated — role tabs + "More" (input `moreActive`; emits `more`, which opens the drawer: language, sign out, remaining pages) |
| `shell/user-avatar/user-avatar.component.ts` | *(shell, mobile top bar)* | all authenticated — initials on the tenant colour, links to `/profile`, optional alert dot |
| `profile/profile-page/profile-page.component.ts` | `/profile` | all |
| `client/workout-dashboard/workout-dashboard.component.ts` | `/dashboard` | user · free · trainer · admin — owns all state; exactly one exercise card is open (`openId` = hand-picked `manualOpenId` ?? first unfinished exercise). `completeSet(i)` finishes the current round, starts the exercise's rest timer between rounds and moves on after the last one; `undoRound(i, r)` reopens a round; saving writes `is_completed` per round |
| `client/workout-dashboard/components/workout-summary.component.ts` | *(sub-component)* | progress card: plan, "Day N of M", completion bar, session volume and duration |
| `client/workout-dashboard/components/exercise-card.component.ts` | *(sub-component)* | open (inputs + "Complete round k/n", with the rest time) or collapsed (done / "2/4 rounds" / pending) row; emits `expand`, `inputChange`, `completeSet`, `undoRound(index)`, `timerStart` |
| `client/workout-dashboard/components/set-inputs.component.ts` | *(sub-component)* | weight/reps steppers: standard mode = one shared pair with a progress dot per round; granular/failure = one block per round that locks when done and reopens via its check chip |
| `client/workout-dashboard/components/suggestion-chip.component.ts` | *(sub-component)* | brain-icon suggested-weight hint; self-contained, remove it with its single usage in the exercise card |
| `client/client-shell/client-shell.component.ts` | *(unused — legacy stub)* | — |
| `trainer/trainer-shell/trainer-shell.component.ts` | `/trainer` (bare router-outlet) | trainer |
| `trainer/exercises/exercise-list/exercise-list.component.ts` | `/trainer/exercises` | trainer |
| `trainer/exercises/exercise-form/exercise-form.component.ts` | `/trainer/exercises/new` | trainer |
| `trainer/exercises/exercise-edit-sheet/exercise-edit-sheet.component.ts` | *(sheet, no route)* | trainer |
| `trainer/exercises/muscle-tag-matrix/muscle-tag-matrix.component.ts` | *(sub-component)* | trainer |
| `trainer/planning/planning-list/planning-list.component.ts` | `/trainer/planning` | trainer |
| `trainer/planning/planning-form/planning-form.component.ts` | `/trainer/planning/new` · `/trainer/planning/:id` · `/my-plan/planning/new` · `/my-plan/planning/:id` | trainer · free · admin — supports read-only view mode for non-owned plans (`isReadOnly` signal gated by `tenant_id !== auth.uid()`) |
| `trainer/clients/client-roster/client-roster.component.ts` | `/trainer/clients` | trainer |
| `trainer/clients/client-detail-sheet/client-detail-sheet.component.ts` | *(sheet, no route)* | trainer |
| `auth/register/register.component.ts` | `/register` | public (invite link) |
| `admin/admin-shell/admin-shell.component.ts` | `/admin` (bare router-outlet) | admin |
| `admin/invite-requests/admin-invite-requests.component.ts` | `/admin/requests` | admin |
| `admin/users/admin-users.component.ts` | `/admin/users` | admin |
| `free/my-plan-shell/my-plan-shell.component.ts` | `/my-plan` (bare router-outlet) | free · admin |
| `free/my-planning-list/my-planning-list.component.ts` | `/my-plan/planning` | free · admin — shows owned plans (full controls) and friend-shared plans (read-only badge with owner name, "Set active" only) |
| `trainer/exercises/exercise-list/exercise-list.component.ts` | `/my-plan/exercises` | free · admin — same component as trainer route; receives `titleKey='myplan.exercises.title'` and `newRoute='/my-plan/exercises/new'` via route `data` (bound via `withComponentInputBinding`) |
| `free/my-friends/my-friends.component.ts` | `/my-plan/friends` | free · admin |
| `profile/push-toggle/push-toggle.component.ts` | *(embedded in `/profile`)* | all — enables/disables push notifications via `PushNotificationService` |

### Shared UI (`src/shared/`)
| Export | File | Type |
|--------|------|------|
| `HlmButtonDirective` | `shared/ui/button/hlm-button.directive.ts` | directive — CVA variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) + sizes (`default`, `sm`, `lg`, `icon`); apply as `[hlmBtn]` attribute |
| `IconButtonComponent` | `shared/ui/button/icon-button.component.ts` | component — icon + optional label button. Inputs: `icon` (IconName, required), `label` (string), `variant`, `size`, `disabled`, `labelMode` (`"always"` \| `"never"` \| `"responsive"`). Use `labelMode="responsive"` for buttons that collapse to icon-only on mobile (e.g. Edit, Delete). Use `labelMode="never"` + `size="icon"` for permanently icon-only. **Prefer this over raw `<button>` + `<app-icon>` for any action button with an icon.** |
| `HlmInputDirective` | `shared/ui/input/` | directive |
| `HlmLabelDirective` | `shared/ui/label/` | directive |
| `HlmBadgeDirective` | `shared/ui/badge/` | directive |
| `HlmSeparatorComponent` | `shared/ui/separator/` | component |
| `HlmSheetComponent` | `shared/ui/sheet/` | component — slide panel (right or bottom side) |
| `TranslatePipe` | `shared/pipes/translate.pipe.ts` | impure pipe — `\| translate` resolves key via `LanguageService` |
| `TenantBrandingComponent` | `shared/components/tenant-branding/` | component — SVG logo + tenant name (reads from `auth.tenant()`) |
| `CountdownTimerComponent` | `shared/components/countdown-timer/` | component — fullscreen overlay ↔ bottom toast, both with a `+30s` button; mounted once in AppShell; driven by `CountdownTimerService` signals |
| `AppIconComponent` | `shared/ui/icons/` | component — `<app-icon name="…" iconClass="…" />`. Icons are Phosphor Regular, one `svg/<name>.ts` module each, registered in `icons.registry.ts` (the header there explains how to add one). **Gotcha:** `styles.css` has a global `svg { fill }` rule that beats the `fill="currentColor"` attribute, so add `fill-current` to `iconClass` when the icon should follow the text colour |
| `StepperComponent` | `shared/components/stepper/` | component — value on top, two 48px −/+ buttons below (never clips on narrow screens); the value is a real number input. Inputs: `value`, `label`, `step`, `min`, `placeholder`, `disabled`. Output: `valueChange` (`number \| null`) |
| `ExigenceBadgeComponent` | `shared/components/exigence-badge/` | component — A–D pill. Input: `level` |
| `MuscleChipsComponent` | `shared/components/muscle-chips/` | component — muscle tags, primary first (tenant tint), wraps on narrow screens. Input: `muscles` |
| `EmptyStateComponent` | `shared/components/empty-state/` | component — centered empty placeholder. Inputs: `message` (string, required), `hint` (string, optional). Use whenever a list or section has no items. |
| `SkeletonComponent` | `shared/components/skeleton/` | component — animated loading pulse rows. Inputs: `count` (number, default `3`), `itemClass` (string, default `'h-14'`). Use instead of inline `@for` animate-pulse blocks. |
| `ToggleComponent` | `shared/components/toggle/` | component — accessible boolean switch styled with tenant primary color. Inputs: `active` (boolean, required). Output: `changed` (boolean). Replaces inline `role="switch"` buttons with class-mapping methods. |
| `PageHeaderComponent` | `shared/components/page-header/` | component — standardised page title + subtitle row with `ng-content` slot for the action button. Inputs: `title` (string, required), `subtitle` (string, optional). Use at the top of every list/admin page. |
| `UpdatePromptComponent` | `shared/components/update-prompt/` | component — banner shown when `PwaUpdateService.updateReady()`; applies the new service-worker version and reloads |
| `OfflineBannerComponent` | `shared/components/offline-banner/` | component — banner shown while `NetworkStatusService.online()` is false |

### Shared Utilities (`src/shared/utils/`)
| Export | File | Purpose |
|--------|------|---------|
| `formatDate(iso)` | `shared/utils/format.ts` | Formats an ISO date string to locale short date (`Jan 1, 2026`). Use everywhere a date is displayed — never inline `toLocaleDateString`. |
| `shareOrCopy(url, title, text)` | `shared/utils/share.ts` | Uses `navigator.share` if available, falls back to `navigator.clipboard.writeText`. Use for all invite/share flows. |
| `copyWithTimeout(value, setter, ms?)` | `shared/utils/share.ts` | Copies `value` to clipboard, calls `setter(value)` immediately and `setter(null)` after `ms` (default 2000). Use for copy-ID buttons that show a transient "Copied" label. |
| `isValidEmail(email)` | `shared/utils/validators.ts` | Returns `true` if the string matches a basic email pattern. Use before calling invite edge functions. |
| `nextStepValue(current, fallback, step, min, direction)` | `shared/utils/number-step.ts` | Next value of a ± stepper: starts from the value, else the placeholder, else 0; clamps to `min`; rounds to 2 decimals. |
| `initials(name)` | `shared/utils/initials.ts` | Up to two uppercase initials (first and last word); `"?"` when there is no name. |
| `formatDuration(seconds)` | `shared/utils/format.ts` | Clock-style duration: `28:14`, or `1:05:09` past an hour; `0:00` for negative or invalid input. |

---

## 5. Algorithmic Specifications

### Dynamic Theming Math (Runtime HSL Engine)
The application dynamically reads a singular `tenant_primary_hex` at runtime, translates it into HSL space, and maps dynamic tokens on the container context:
- `h, s, l` derived accurately from Hex.
- `--tenant-primary: h s% l%`.
- `--tenant-hover`: `h s% max(0, l - 10)%`.
- `--tenant-highlight`: `h s% min(100, l + 40)%`.
- `--tenant-shadow`: `h s% max(0, l - 30)%`.
- `--tenant-contrast`: If $l > 60$, evaluate to dark text color token (`0 0% 0%`), else light text color token (`0 0% 100%`).
### Estimated 1-Rep Max ($1\text{RM}$) Progressive Overload Formula
When `use_auto_1rm` evaluates to true, placeholder weights derive programmatically from historical lifting patterns using the Epley Formula:
$$1\text{RM} = w_{\text{hist}} \cdot \left(1 + \frac{r_{\text{hist}}}{30}\right)$$
When calculating the target weight suggestions ($w_{\text{suggested}}$) for a new prescription row containing a target repetition count ($r_{\text{target}}$):
$$w_{\text{suggested}} = \frac{1\text{RM}}{1 + \frac{r_{\text{target}}}{30}}$$
If historical entries are absent, fallback targets gracefully use the trainer's parameterized `suggested_first_weight`.

---

## 6. Security Notes

- **RLS is the real access boundary.** Route guards (`authGuard`, `roleGuard`) are a UX convenience only — never rely on them alone to protect data. Every table must have RLS policies that hold up if called directly.
- **`profiles.role` cannot be self-escalated.** The `"profiles: update own"` policy was replaced in `20260921160530_restrict_role_self_update.sql` so a user can update their own row but not their own `role` column, unless they're already an admin.
- **Auth uses Supabase JWTs** (bearer tokens in `localStorage`), not cookies — CSRF protection is not needed.
- **Tenant logo SVGs are sanitized client-side.** `tenant_logo_svg` is user-controlled (trainer-uploaded), size-capped at 64KB at the DB level, and sanitized with DOMPurify (`USE_PROFILES: { svg: true, svgFilters: true }`) in `TenantBrandingComponent` before being trusted via `bypassSecurityTrustHtml`. This strips `<script>`, event handlers (`onload`, `onclick`, etc.), and `javascript:` URLs while preserving legitimate shape/path markup.
- **CSP headers** (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`) are set in `vercel.json` — they apply to the deployed Vercel site only, not local `ng serve`. `script-src 'self'` forbids inline scripts and event handlers, so the production build sets `optimization.styles.inlineCritical: false` in `angular.json` (Angular's critical-CSS `<link onload=…>` trick would otherwise leave `styles.css` unapplied). Run `pnpm build && pnpm check:csp` after changing build, font or script-loading config; Google Fonts files are allowed via `font-src https://fonts.gstatic.com`.

## Commit Attribution
Never add a `Co-Authored-By: Claude ...` trailer (or any Claude/Anthropic attribution line) to commit messages or PR descriptions. See `.clouderule`.
