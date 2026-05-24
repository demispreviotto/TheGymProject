-- =============================================================================
-- 02_tables.sql
-- Full application DDL — canonical schema as defined in CLAUDE.md §3.
-- Expand/Contract migrations branch from this baseline.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PROFILES
-- Extends auth.users with application-level identity and tenant metadata.
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id                  UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  role                user_role NOT NULL DEFAULT 'free',
  tenant_id           UUID REFERENCES auth.users(id) NULL,
  tenant_name         TEXT NULL,
  tenant_logo_svg     TEXT NULL,
  tenant_primary_hex  VARCHAR(7) NOT NULL DEFAULT '#EF4444',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_svg_size CHECK (octet_length(tenant_logo_svg) <= 65535),
  CONSTRAINT chk_hex_format CHECK (tenant_primary_hex ~ '^#[0-9A-Fa-f]{6}$')
);

-- ---------------------------------------------------------------------------
-- EXERCISES
-- tenant_id = NULL → global system default (visible to all tenants).
-- tenant_id = <trainer uuid> → private to that trainer's tenant.
-- ---------------------------------------------------------------------------
CREATE TABLE exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES auth.users(id) NULL,
  name          TEXT NOT NULL,
  definition    TEXT,
  recommendations TEXT,
  -- Schema: Array<{ name: string; intensity: muscle_intensity }>
  muscle_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_tenant_id ON exercises (tenant_id);

-- ---------------------------------------------------------------------------
-- PLANNING
-- ---------------------------------------------------------------------------
CREATE TABLE plannings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES auth.users(id) NOT NULL,
  title         TEXT NOT NULL,
  use_auto_1rm  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE planning_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID REFERENCES plannings(id) ON DELETE CASCADE NOT NULL,
  day_number  INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  UNIQUE (planning_id, day_number)
);

CREATE TABLE prescribed_exercises (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_day_id       UUID REFERENCES planning_days(id) ON DELETE CASCADE NOT NULL,
  exercise_id           UUID REFERENCES exercises(id) NOT NULL,
  exigence              CHAR(1) NOT NULL CHECK (exigence IN ('A', 'B', 'C', 'D')),
  rest_time_minutes     NUMERIC(3, 1) NOT NULL,
  tracking_mode         tracking_mode NOT NULL DEFAULT 'standard',
  rounds                INT NOT NULL,
  target_reps           INT NOT NULL,
  suggested_first_weight NUMERIC(5, 2),
  sorting_order         INT NOT NULL
);

CREATE INDEX idx_prescribed_exercises_day ON prescribed_exercises (planning_day_id);

-- ---------------------------------------------------------------------------
-- WORKOUT EXECUTION LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE workout_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  planning_id     UUID REFERENCES plannings(id) NOT NULL,
  day_number      INT NOT NULL,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subjective_score INT CHECK (subjective_score BETWEEN 1 AND 5)
);

CREATE INDEX idx_workout_sessions_user ON workout_sessions (user_id);
CREATE INDEX idx_workout_sessions_planning ON workout_sessions (planning_id);

CREATE TABLE workout_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id    UUID REFERENCES exercises(id) NOT NULL,
  round_number   INT NOT NULL,
  weight_used    NUMERIC(5, 2) NOT NULL,
  reps_performed INT NOT NULL,
  is_completed   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_workout_logs_session ON workout_logs (session_id);
