
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
