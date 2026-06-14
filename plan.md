
# plan.md: Phased Implementation Roadmap

Execute development of the application linearly according to the following isolated sprints. Do not move onto a subsequent stage until all code implementations in the prior step are fully verified, operational, and free of architectural regressions.

---

## Phase 1: Local Infrastructure Setup & DB Bootstrapping
**Status: ✅ COMPLETE**

### Delivered
- Supabase CLI replaced docker-compose as the local runtime.
- All DB schema, RLS policies, and seed data are in `supabase/migrations/` and `supabase/seed.sql`.
- Angular 19 standalone scaffold compiled with zero errors.
- Spartan UI primitives scaffolded: `hlm-button`, `hlm-badge`, `hlm-input`, `hlm-label`, `hlm-separator`.

---

## Phase 2: Core Authentication, Tenancy & Dynamic Theming Engine
**Status: ✅ COMPLETE**

### Delivered
- `AuthService` (`core/auth/auth.service.ts`) — `onAuthStateChange` signal store, `signIn`, `signUp`, `signOut`, `loadProfile`, role-based redirect after login.
- `ThemeService` (`core/theme/theme.service.ts`) — hex→HSL conversion and CSS custom property injection per the `claude.md` math spec.
- `roleGuard` + `authGuard` (`core/guards/role.guard.ts`) — **async** (rewritten in Phase 5 Task 1); pipe `isLoading` via `toObservable`, eliminates hard-refresh race condition.
- `TenantBrandingComponent` (`shared/components/tenant-branding/`) — safe SVG rendering via `DomSanitizer`.
- `LoginComponent` (`features/auth/login/`) — email/password form with error display.

---

## Phase 3: Mobile Client Workspace (Home Tracking Flow)
**Status: ✅ COMPLETE (finalised in Phase 5 Task 2)**

### Originally Delivered (Phase 3)
- All planning TypeScript types (`core/planning/planning.types.ts`): `Exercise`, `Planning`, `PlanningDay`, `PrescribedExercise`, `WorkoutSession`, `WorkoutLog`, plus enums `MuscleIntensity`, `TrackingMode`, `ExigenceLevel`.
- DB migration `20260524000004_profiles_assigned_planning.sql` — `assigned_planning_id UUID` on `profiles`.
- Seed: Push/Pull/Legs beginner block assigned to `user@test.local`.
- `ClientShellComponent` — stub placeholder only; no workout logic.

### Completed in Phase 5 Task 2
- `WorkoutService` (`core/workout/workout.service.ts`):
  - `loadPlan(planningId)` — deep join: `plannings → planning_days → prescribed_exercises → exercises`.
  - `loadLastSession(userId, planningId)` — resolves last completed session for day cycling.
  - `loadLastLog(userId, exerciseId)` — fetches most recent completed log entry for Epley weight suggestion.
  - `saveSession(...)` — atomic batch: one `workout_sessions` row + N `workout_logs` rows.
  - `resolveActiveDay(lastSession, availableDays)` — cycles to next day, wraps back to first after last.
  - `computeSuggestedWeight(log, targetReps, fallback)` — Epley formula, rounds to nearest 0.25 kg.
- `WorkoutDashboardComponent` (`features/client/workout-dashboard/`):
  - Loads `assigned_planning_id` from profile; shows empty-state card if null.
  - `standard` mode: one shared weight + reps input applied to all rounds.
  - `granular` / `failure` mode: per-round weight + reps input pairs.
  - Exigence badges: A = red, B = orange, C = yellow, D = cyan.
  - Mark-complete toggle per exercise row (signal-local until session close).
  - "Finish Workout" bottom drawer with 1–5 star subjective score.
  - On confirm: batch writes to DB, reloads component → auto-increments to next day.

---

## Phase 4: Desktop Administrative Workspace (Trainer Custom Dashboard)
**Status: ✅ COMPLETE (finalised in Phase 5 Tasks 3–4)**

### Originally Delivered (Phase 4)
- `ExerciseService` (`core/exercises/exercise.service.ts`) — full CRUD with tenant scoping.
- `PlanningService` (`core/planning/planning.service.ts`) — full CRUD: planning, days, prescribed exercise rows; user assignment (`assignPlanning`); tenant user loading.
- `ExerciseListComponent` — tabular list of tenant + global exercises.
- `ExerciseFormComponent` — create-only page at `/trainer/exercises/new` (edit was originally page-nav to `:id`, now replaced by sheet).
- `MuscleTagMatrixComponent` — CDK drag-and-drop with intensity-colour assignment.
- `PlanningListComponent` — tabular list with delete.
- `PlanningFormComponent` — Day 1–7 accordion, CDK-sortable prescribed rows, user-assignment checkboxes.
- `TrainerShellComponent` — was a full sidebar layout; **now a bare `<router-outlet>`** (layout moved to `AppShellComponent`).

### Completed in Phase 5 Task 3 — Client Portal
- DB migration `20260526000005_profiles_is_active.sql` — `is_active BOOLEAN DEFAULT TRUE NOT NULL` on `profiles`.
- `HlmSheetComponent` (`shared/ui/sheet/`) — reusable slide-panel primitive (right or bottom side, backdrop, close button, title slot).
- `ClientRosterComponent` (`features/trainer/clients/client-roster/`) — tabular active-client grid + collapsed inactive accordion. Resolves plan title from in-memory `PlanningService.plannings()`.
- `ClientDetailSheetComponent` (`features/trainer/clients/client-detail-sheet/`) — plan reassignment `<select>` (calls `PlanningService.assignPlanning`) + `is_active` toggle (direct Supabase update).

### Completed in Phase 5 Task 4 — Exercise Edit Sheet
- `ExerciseEditSheetComponent` (`features/trainer/exercises/exercise-edit-sheet/`) — fields locked by default; "Modify Structural Definition" button unlocks them. Global exercises permanently read-only. Reuses `MuscleTagMatrixComponent`.
- `ExerciseListComponent` — refactored: row click opens `ExerciseEditSheetComponent` instead of navigating. Global exercise rows also clickable (locked view).
- Route `/trainer/exercises/:id` removed from `app.routes.ts`.

---

## Phase 5: Layout Consolidation, Multi-Role Shell, and Admin Expansion
**Status: ✅ COMPLETE**

### Task 1: Core Routing Infrastructure & Async Security Fix ✅

**Delivered:**
- `authGuard` + `roleGuard` rewritten as async observables (`core/guards/role.guard.ts`). Both pipe `AuthService.isLoading` via `toObservable`, filter until `false`, then evaluate profile. Eliminates hard-refresh race condition on all protected routes.
- `AppShellComponent` (`features/shell/app-shell/`) — single universal layout wrapping all authenticated routes:
  - Desktop (≥ `lg`): fixed left sidebar always visible.
  - Mobile: top bar with hamburger; sidebar slides in as off-canvas drawer over a backdrop.
  - Role-aware nav: `trainer` → Exercises / Training Plans / Clients / Profile; `user`/`free` → Today's Workout / Profile.
  - Sign out button in sidebar footer.
- `TrainerShellComponent` stripped to `<router-outlet>` only.
- `app.routes.ts` final map:
  ```
  /login                         → LoginComponent (no guard)
  /  (AppShellComponent, authGuard)
    ''                           → redirect → /dashboard
    /trainer  (roleGuard trainer, TrainerShellComponent)
      ''                         → redirect → exercises
      /exercises                 → ExerciseListComponent
      /exercises/new             → ExerciseFormComponent
      /planning                  → PlanningListComponent
      /planning/new              → PlanningFormComponent
      /planning/:id              → PlanningFormComponent
      /clients                   → ClientRosterComponent
    /dashboard  (roleGuard user|trainer|free)
                                 → WorkoutDashboardComponent
    /profile                     → ProfilePageComponent
  **                             → redirect → /login
  ```

### Task 2: Workout Dashboard ✅
See Phase 3 "Completed in Phase 5 Task 2" above.

### Task 3: Client Portal ✅
See Phase 4 "Completed in Phase 5 Task 3" above.

### Task 4: Exercise Edit Sheet ✅
See Phase 4 "Completed in Phase 5 Task 4" above.

### Task 5: Profile Page ✅

**Delivered:**
- `ProfilePageComponent` (`features/profile/profile-page/`) — read-only card accessible at `/profile` by all roles:
  - Name, Email, Role badge (colour-coded per role), Member since.
  - Tenant name + hex colour swatch if `tenant_name` is set.
  - No edit capability.

---

## Phase 6: Multi-Tenant Onboarding, Shareable Protocols, & Native Translation
**Status: ✅ Complete**

### Task 1: Reactive Localization Engine ✅

**Delivered:**
- `core/i18n/i18n.dictionary.ts` — 70+ key flat dictionary typed as `Record<string, { en: string; es: string }>`. Covers nav labels, empty states, button text, and all feature-screen strings. Exposes a `translate(key, lang)` pure function.
- `core/i18n/language.service.ts` — `activeLanguage` writable signal (`'en' | 'es'`). `initFromProfile(profile)` called by `AuthService` on every auth state change. `setLanguage(lang)` updates the signal synchronously and persists to `profiles.preferred_language` via a fire-and-forget Supabase update (uses `supabase.auth.getUser()` to avoid circular injection).
- `shared/pipes/translate.pipe.ts` — `| translate` impure pipe. Reads `LanguageService.activeLanguage()` on each change-detection cycle. Falls back to the raw key string — no blank UI.
- `AppShellComponent` — EN / ES text toggle in the sidebar footer. All six nav labels use `| translate`.
- Templates updated: `ExerciseListComponent`, `PlanningListComponent`, `ClientRosterComponent`, `WorkoutDashboardComponent`, `ProfilePageComponent` — all visible strings migrated to translation keys.

---

### Task 2: Standalone Tenant Schema Extraction ✅

**Delivered (expand step only — contract deferred):**
- Migration `20260530000006_phase6_schema.sql`:
  - `CREATE TABLE public.tenants (id, owner_id, name, logo_svg, primary_hex, created_at)` with RLS: owner has full access; members can read via `profiles.tenant_ref_id`.
  - `ALTER TABLE profiles ADD COLUMN tenant_ref_id UUID REFERENCES tenants(id)` — new FK alongside the existing inline branding columns.
  - `ALTER TABLE profiles ADD COLUMN preferred_language VARCHAR(2) DEFAULT 'en' NOT NULL`.
  - `ALTER TABLE profiles ADD COLUMN assigned_trainer_id UUID REFERENCES profiles(id)`.
  - `ALTER TABLE plannings ADD COLUMN is_shared_with_gym BOOLEAN DEFAULT FALSE NOT NULL`.
- `seed.sql` updated: inserts one `tenants` row for the test gym; sets `profiles.tenant_ref_id` on trainer and user accounts.
- `auth.types.ts` updated: `Profile` gains `tenant_ref_id`, `preferred_language`, `assigned_trainer_id`; new `Tenant` interface added; `Language` type alias added.
- `AuthService.loadProfile()` now joins `tenants!tenant_ref_id(*)` and exposes an `auth.tenant()` signal + `patchTenant()` method.
- `ThemeService` updated: `applyFromProfile` replaced by `applyFromTenant(tenant: Tenant | null)`.
- `TenantBrandingComponent` updated: reads `auth.tenant()?.name` and `auth.tenant()?.logo_svg` instead of inline profile columns.

> **Contract step deferred to Phase 7:** `profiles.tenant_id` still references `auth.users(id)` (trainer's user ID) because 7 existing RLS policies compare `tenant_id = auth.uid()`. Dropping or renaming that column requires rewriting all dependent policies first. The inline branding columns (`tenant_name`, `tenant_logo_svg`, `tenant_primary_hex`) remain on profiles until that contract migration runs.

---

### Task 3: Trainer Profile & Live Branding Controls ✅

**Delivered:**
- `core/tenant/tenant.service.ts` — `tenant` computed from `auth.tenant()`. `update(patch)` writes to Supabase, then calls `auth.patchTenant(patch)` and `theme.applyFromTenant(updated)` — changes are reflected in the sidebar and theme immediately without a page reload.
- `ProfilePageComponent` — trainer-only "Gym Branding" collapsible section:
  - Locked by default; "Edit Branding" button unlocks all fields.
  - Gym name input, primary hex input with live colour swatch preview (validates `#[0-9A-Fa-f]{6}`; invalid entries show an inline error and block the save), logo SVG textarea.
  - Hex preview: `ThemeService.applyHex()` is called on every valid keystroke so the trainer sees the sidebar theme update in real time.
  - Cancel: restores fields from `auth.tenant()` and reverts the theme.
  - All labels use `| translate`.

---

### Task 4: Connected Protocol Link Sharing ✅

**Delivered:**
- `PlanningService.setShared(planId, value)` — updates `is_shared_with_gym` in DB and reflects immediately in the `plannings` signal.
- `PlanningService.lookupSharedPlan(planId)` — unscoped query returning any plan where `id = input AND is_shared_with_gym = true`.
- `PlanningListComponent` — share icon button per row; clicking expands an inline panel containing:
  - Read-only UUID field + "Copy ID" / "Copied!" clipboard button (native Clipboard API, no libraries).
  - `is_shared_with_gym` toggle styled with tenant primary colour.
  - Active share state reflected on the icon button itself (colour-tinted when sharing is on).
- `WorkoutDashboardComponent` empty state — "Have a plan ID?" card with:
  - UUID text input + "Connect" button.
  - Client-side UUID format validation before any DB call.
  - On valid ID: calls `lookupSharedPlan` → writes `profiles.assigned_planning_id` → reloads the dashboard.
  - Error messages are translation keys resolved by `| translate` at render time.

---

## Phase 7: Invitation & Access Control System
**Status: ✅ COMPLETE (local) — ⏳ Pending production deploy**

> **Environment status:**
> - Local Docker: all migrations applied and verified ✓
> - Production (Vercel + Supabase): last applied migration is Phase 6 (`20260530000006`). The 3 migrations below must be pushed via `supabase db push` before deploying the frontend.

### Migrations (local only — not yet in production)
| File | What it adds |
|------|-------------|
| `20260605174327_invite_trigger_update.sql` | `handle_new_user` reads `raw_app_meta_data` for role/tenant linkage |
| `20260605182335_add_admin_role.sql` | `'admin'` value added to `user_role` enum |
| `20260605182337_invite_requests_table.sql` | `invite_requests` table + RLS + admin profile policies + trainer invite auto-creates tenant row |

### Edge Functions (must be deployed)
```bash
supabase functions deploy invite-client --project-ref YOUR_REF
supabase secrets set SITE_URL=https://YOUR_VERCEL_URL --project-ref YOUR_REF
```

### Supabase Dashboard (manual — Auth > URL Configuration)
- Site URL: `https://YOUR_VERCEL_URL`
- Add redirect URL: `https://YOUR_VERCEL_URL/register`

### Delivered
- **`admin` role**: new `UserRole` value; `roleGuard` + `redirectByRole` handle it; admin lands on `/admin` after login
- **`/register` route**: public route for invite link redemption; `RegisterComponent` handles `#access_token` from invite email, lets user set name + password
- **Trainer → client invite** (`/trainer/clients`): "Invite Client" button sends email via Edge Function; client auto-linked to trainer's tenant
- **Free user invite requests** (`/profile`): free users submit up to 2 invite requests (name, email, reason, responsibility checkbox); capped at 2 pending+approved
- **Admin portal** (`/admin/requests`): table of all invite requests with Approve & Invite / Reject actions
- **Admin user management** (`/admin/users`): full user table with role dropdown, active toggle, direct invite form (any role)
- **`invite_requests` table**: RLS — requesters read own; admin reads all, updates status
- **`handle_new_user` trigger** updated: reads `app_metadata` for role/tenant; trainer invites auto-create a `tenants` row
- **i18n**: 27 new translation keys for all new UI (EN/ES)

### To activate admin on your own account (post deploy)
In Supabase Studio → `profiles` table → find your row → set `role = 'admin'`

---

## Phase 8: Free User Self-Service Planning + Friend Sharing
**Status: ✅ COMPLETE (local) — ⏳ Pending production deploy**

> **Environment status:**
> - Local Docker: migration applied and verified ✓
> - Production: pending — deploy alongside Phase 7 migrations

### Migrations (local only)
| File | What it adds |
|------|-------------|
| `20260605191428_phase8_free_user_planning.sql` | RLS for free/admin on exercises + plannings + planning_days + prescribed_exercises; `plannings.is_shared_with_friends`; `friendships` table + RLS |
| `20260613114250_friendship_profile_read_policy.sql` | Any authenticated user can SELECT all profiles (required for friend name lookups and invite-request requester display) |
| `20260614082904_shared_plan_days_read.sql` | Friends can SELECT planning_days, prescribed_exercises, and exercises referenced in shared plans |

### Delivered
- **Free/admin users can create their own exercises** (`/my-plan/exercises`) — private, only visible to themselves; use same `ExerciseService` and `ExerciseEditSheetComponent`
- **Free/admin users can create their own training plans** (`/my-plan/planning`) — full CRUD via `PlanningFormComponent` (shared from trainer section); `../` back-navigation works naturally
- **Friend request system** (`/my-plan/friends`) — send request by email, accept/reject incoming, cancel sent; `FriendshipService` in `core/friendships/`
- **Plan sharing with friends** — "Share with friends" toggle on each plan (`is_shared_with_friends`); accepted friends can read shared plans via RLS (including days, prescribed exercises, and exercise definitions)
- **Shared plans viewable in read-only mode** — clicking a friend's shared plan opens `PlanningFormComponent` in read-only state (no edit controls, empty days hidden, "Shared with you" subtitle); owner name shown in plan list badge
- **Nav updated**: free and admin users see "My Plans", "My Exercises", "Friends" in sidebar
- **Trainer and admin access Today's Workout** — `/dashboard` now accessible to all roles; trainer/admin see the dashboard link in their nav; no-plan CTA routes to the correct planning section per role (`/trainer/planning` for trainer, `/my-plan/planning` for free/admin)
- **i18n**: 20 new translation keys (EN/ES)

---

## Phase 8.1: Rest Timer Component
**Status: ✅ COMPLETE (local)**

### Delivered
- **`CountdownTimerService`** (`core/timer/countdown-timer.service.ts`) — singleton signal store; `secondsLeft`, `isFullscreen`, `isActive`, `isBlinking` (≤5 s) computed signals. `start(seconds)` always clears any prior interval before starting a new one; `cancel()` clears the `setInterval` ref and resets all signals. No zombie timers possible.
- **`CountdownTimerComponent`** (`shared/components/countdown-timer/countdown-timer.component.ts`) — mounted once in `AppShellComponent` outside `<router-outlet>`. Two render states:
  - **Fullscreen overlay**: tap outside → collapses to toast.
  - **Toast** (bottom-center): tap → re-expands to fullscreen.
  - Last 5 seconds: number blinks via CSS `@keyframes`. On completion: disappears automatically.
  - `×` cancel button available in both states.
- **Timer button** on each exercise card (top-right of header row) — disabled on all cards while any timer is running (singleton enforces one-at-a-time). `WorkoutDashboardComponent.ngOnDestroy()` calls `timerService.cancel()` to silently kill the timer on navigation.
- **`timer` icon** added to SVG icon registry (`shared/ui/icons/svg/timer.ts`).

---

## Phase 9: Corporate Gym & Organization Tier
**Status: 🗺 Conceptual — not scheduled**

*Introduces a fourth role (`'gym'`) enabling multi-trainer facilities. Gym accounts act as overarching managers with authority over trainer and client assignment. Implementation is deferred until Phase 8 is fully shipped.*

**Role hierarchy**
```
gym  →  trainer(s)  →  user(s)
```

**Gym-level capabilities**
- Assign gym-affiliated clients to available trainers (`assigned_trainer_id`).
- Independent trainers who affiliate with a gym inherit the corporate theme automatically; their personal `tenants.primary_hex` modifications are locked while the gym affiliation is active.
- Gym managers can view aggregated client rosters across all affiliated trainers.

**Scope marker**
`UserRole` type will expand to `'trainer' | 'user' | 'free' | 'gym'`. `roleGuard` and all role-conditional rendering blocks must be updated at that point.

---

## Lifecycle Backlog & Transformation Rules

These operations govern account state transitions and relationship teardowns. They must be supported by service-level methods before any UI exposing them is built.

> None of these operations delete historical training logs. Structural unlinking only affects relationship IDs and role values.

### 1. Athlete Disconnection
A client (role `user`) severs their trainer/gym relationship voluntarily.

**Contract:**
- Clear `profiles.tenant_id → NULL`.
- Clear `profiles.assigned_trainer_id → NULL`.
- Clear `profiles.assigned_planning_id → NULL`.
- Downgrade `profiles.role → 'free'`.
- Historical `workout_sessions` and `workout_logs` are untouched.
- The client's `ProfilePageComponent` should expose a "Leave gym" destructive action (confirmation required).

### 2. Account Upgrade: Free → Trainer
A free user who has authored protocols during their free tier converts to a trainer account.

**Contract:**
- Set `profiles.role → 'trainer'`.
- Insert one row into `tenants` for the new trainer (default gym name = their display name; default hex = `#EF4444`).
- Set `profiles.tenant_id → new tenant.id`.
- Any `plannings` authored under their `user_id` are re-scoped to `tenant_id` (ownership transferred from personal to gym).
- No data deleted. Login redirect changes to `/trainer` on next session.

### 3. Corporate Termination: Gym Removes a Trainer
A gym manager (`role = 'gym'`) terminates the affiliation of a trainer who has active clients.

**Contract:**
- For each client profile where `assigned_trainer_id = terminated_trainer_id`:
  - Set `assigned_trainer_id → NULL`.
  - Optionally reassign to a replacement trainer (provided by the gym manager in the UI).
  - If no replacement: set `assigned_planning_id → NULL`; downgrade role to `'free'`.
- The terminated trainer's own profile: clear `tenant_id` (gym affiliation removed); role reverts to `'trainer'` (independent) rather than being deleted.
- Historical logs for all affected clients remain intact.
