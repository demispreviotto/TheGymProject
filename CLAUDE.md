# claude.md: Project Blueprint & System Architecture

This file serves as the definitive single source of truth for the Gym Planificación web application. All code generated must comply with the patterns, constraints, and architecture outlined below.

---

## Current Development State

**Active Phase:** All phases complete — application fully built.

| Phase | Status | Summary |
|-------|--------|---------|
| 1 — Infrastructure | ✅ Done | Supabase CLI, SQL schema + RLS migrations, seed data |
| 2 — Angular Scaffold | ✅ Done | Auth, ThemeService, async roleGuard/authGuard, LoginComponent |
| 3 — Mobile Workout Engine | ✅ Done | WorkoutService + WorkoutDashboardComponent: Epley 1RM, adaptive inputs, session drawer |
| 4 — Trainer Admin Dashboard | ✅ Done | Exercise & Planning CRUD, ExerciseEditSheetComponent, ClientRosterComponent + ClientDetailSheetComponent |
| 5 — Shell, Workout Engine, Client Portal | ✅ Done | AppShellComponent (universal layout), all routes wired, ProfilePageComponent |

**Local dev ports:** Kong API `54321` · DB `54322` · Studio `54323` · Mailpit `54324`

**Start dev:** `pnpm exec supabase start` → `pnpm start`

---

## 0. Critical Execution Constraints & Environment

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
- **Frontend Framework:** Angular (Latest, Standalone Components, Signal-based reactivity)
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

## 4. Codebase File Map

All source lives under `src/`. Angular app root is `src/app/`.

### Migrations (`supabase/migrations/`)
| File | What it adds |
|------|-------------|
| `20260524000001_enums.sql` | `user_role`, `muscle_intensity`, `tracking_mode` enums |
| `20260524000002_tables.sql` | All core tables |
| `20260524000003_rls.sql` | Row-Level Security policies |
| `20260524000004_profiles_assigned_planning.sql` | `profiles.assigned_planning_id` |
| `20260526000005_profiles_is_active.sql` | `profiles.is_active` |

### Core (`src/core/`)
| File | Purpose |
|------|---------|
| `auth/auth.types.ts` | `UserRole` type + `Profile` interface (full column set including `assigned_planning_id`, `is_active`) |
| `auth/auth.service.ts` | Signal store: `profile`, `isLoading`. `signIn`, `signUp`, `signOut`, `loadProfile`, `redirectByRole` |
| `guards/role.guard.ts` | `authGuard` (any authenticated user) + `roleGuard(roles[])` — both async via `toObservable(isLoading)` |
| `supabase/supabase.client.ts` | `SUPABASE_CLIENT` InjectionToken |
| `theme/theme.service.ts` | Hex→HSL conversion; injects `--tenant-*` CSS custom properties |
| `exercises/exercise.service.ts` | `exercises` signal; `load`, `create`, `update`, `delete` |
| `planning/planning.types.ts` | All domain types: `Exercise`, `Planning`, `PlanningDay`, `PrescribedExercise`, `WorkoutSession`, `WorkoutLog`, enums |
| `planning/planning.service.ts` | `plannings` signal; `loadPlannings`, `loadFull`, `create`, `update`, `delete`, `assignPlanning`, `loadTenantUsers` |
| `workout/workout.service.ts` | `loadPlan` (deep join with exercises), `loadLastSession`, `loadLastLog`, `saveSession`, `resolveActiveDay`, `computeSuggestedWeight` |

### Features (`src/features/`)
| File | Route | Role |
|------|-------|------|
| `auth/login/login.component.ts` | `/login` | public |
| `shell/app-shell/app-shell.component.ts` | `/` (layout wrapper) | all authenticated |
| `profile/profile-page/profile-page.component.ts` | `/profile` | all |
| `client/workout-dashboard/workout-dashboard.component.ts` | `/dashboard` | user · free · trainer |
| `client/client-shell/client-shell.component.ts` | *(unused — legacy stub)* | — |
| `trainer/trainer-shell/trainer-shell.component.ts` | `/trainer` (bare router-outlet) | trainer |
| `trainer/exercises/exercise-list/exercise-list.component.ts` | `/trainer/exercises` | trainer |
| `trainer/exercises/exercise-form/exercise-form.component.ts` | `/trainer/exercises/new` | trainer |
| `trainer/exercises/exercise-edit-sheet/exercise-edit-sheet.component.ts` | *(sheet, no route)* | trainer |
| `trainer/exercises/muscle-tag-matrix/muscle-tag-matrix.component.ts` | *(sub-component)* | trainer |
| `trainer/planning/planning-list/planning-list.component.ts` | `/trainer/planning` | trainer |
| `trainer/planning/planning-form/planning-form.component.ts` | `/trainer/planning/new` · `/trainer/planning/:id` | trainer |
| `trainer/clients/client-roster/client-roster.component.ts` | `/trainer/clients` | trainer |
| `trainer/clients/client-detail-sheet/client-detail-sheet.component.ts` | *(sheet, no route)* | trainer |

### Shared UI (`src/shared/`)
| Export | File | Type |
|--------|------|------|
| `HlmButtonDirective` | `shared/ui/button/` | directive |
| `HlmInputDirective` | `shared/ui/input/` | directive |
| `HlmLabelDirective` | `shared/ui/label/` | directive |
| `HlmBadgeDirective` | `shared/ui/badge/` | directive |
| `HlmSeparatorComponent` | `shared/ui/separator/` | component |
| `HlmSheetComponent` | `shared/ui/sheet/` | component — slide panel (right or bottom side) |
| `TenantBrandingComponent` | `shared/components/tenant-branding/` | component — SVG logo + tenant name |

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