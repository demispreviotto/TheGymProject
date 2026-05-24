-- =============================================================================
-- 20260524000002_tables.sql
-- Full application DDL + auto-profile trigger.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id                  UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  role                public.user_role NOT NULL DEFAULT 'free',
  tenant_id           UUID REFERENCES auth.users(id) NULL,
  tenant_name         TEXT NULL,
  tenant_logo_svg     TEXT NULL,
  tenant_primary_hex  VARCHAR(7) NOT NULL DEFAULT '#EF4444',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_svg_size   CHECK (octet_length(tenant_logo_svg) <= 65535),
  CONSTRAINT chk_hex_format CHECK (tenant_primary_hex ~ '^#[0-9A-Fa-f]{6}$')
);

-- ---------------------------------------------------------------------------
-- EXERCISES
-- ---------------------------------------------------------------------------
CREATE TABLE public.exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES auth.users(id) NULL,
  name            TEXT NOT NULL,
  definition      TEXT,
  recommendations TEXT,
  muscle_groups   JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_tenant_id ON public.exercises (tenant_id);

-- ---------------------------------------------------------------------------
-- PLANNING
-- ---------------------------------------------------------------------------
CREATE TABLE public.plannings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES auth.users(id) NOT NULL,
  title         TEXT NOT NULL,
  use_auto_1rm  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.planning_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id UUID REFERENCES public.plannings(id) ON DELETE CASCADE NOT NULL,
  day_number  INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  UNIQUE (planning_id, day_number)
);

CREATE TABLE public.prescribed_exercises (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_day_id        UUID REFERENCES public.planning_days(id) ON DELETE CASCADE NOT NULL,
  exercise_id            UUID REFERENCES public.exercises(id) NOT NULL,
  exigence               CHAR(1) NOT NULL CHECK (exigence IN ('A', 'B', 'C', 'D')),
  rest_time_minutes      NUMERIC(3, 1) NOT NULL,
  tracking_mode          public.tracking_mode NOT NULL DEFAULT 'standard',
  rounds                 INT NOT NULL,
  target_reps            INT NOT NULL,
  suggested_first_weight NUMERIC(5, 2),
  sorting_order          INT NOT NULL
);

CREATE INDEX idx_prescribed_exercises_day ON public.prescribed_exercises (planning_day_id);

-- ---------------------------------------------------------------------------
-- WORKOUT EXECUTION LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE public.workout_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  planning_id      UUID REFERENCES public.plannings(id) NOT NULL,
  day_number       INT NOT NULL,
  completed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subjective_score INT CHECK (subjective_score BETWEEN 1 AND 5)
);

CREATE INDEX idx_workout_sessions_user     ON public.workout_sessions (user_id);
CREATE INDEX idx_workout_sessions_planning ON public.workout_sessions (planning_id);

CREATE TABLE public.workout_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id    UUID REFERENCES public.exercises(id) NOT NULL,
  round_number   INT NOT NULL,
  weight_used    NUMERIC(5, 2) NOT NULL,
  reps_performed INT NOT NULL,
  is_completed   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_workout_logs_session ON public.workout_logs (session_id);

-- ---------------------------------------------------------------------------
-- HELPER: current user's role (SECURITY DEFINER avoids RLS recursion on profiles)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- TRIGGER: auto-create profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'free'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
