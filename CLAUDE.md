# claude.md: Project Blueprint & System Architecture

This file serves as the definitive single source of truth for the Gym Planificación web application. All code generated must comply with the patterns, constraints, and architecture outlined below.

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

## 4. Algorithmic Specifications
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