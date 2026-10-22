-- =============================================================================
-- 20261022130000_programs.sql
-- Programs: chain existing weekly plannings into phases that repeat N weeks.
-- Expand only. plannings / planning_days / prescribed_exercises are untouched;
-- profiles.assigned_planning_id keeps working as the fallback.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------
CREATE TABLE public.programs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  is_shared_with_friends BOOLEAN NOT NULL DEFAULT FALSE,
  is_shared_with_gym     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_programs_owner ON public.programs (owner_id);

CREATE TABLE public.program_phases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id   UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  -- No cascade on purpose: a plan used by a program cannot be deleted from under it.
  planning_id  UUID NOT NULL REFERENCES public.plannings(id),
  position     INT NOT NULL CHECK (position >= 1),
  repeat_count INT NOT NULL DEFAULT 1 CHECK (repeat_count BETWEEN 1 AND 52),
  UNIQUE (program_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_program_phases_planning ON public.program_phases (planning_id);

CREATE TABLE public.user_programs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_programs_user ON public.user_programs (user_id);
CREATE UNIQUE INDEX uq_user_programs_one_active ON public.user_programs (user_id) WHERE status = 'active';

-- Sessions logged while following a program (all nullable: older rows have none).
-- planning_id stays NOT NULL and holds the phase's plan, so old read paths still work.
ALTER TABLE public.workout_sessions
  ADD COLUMN user_program_id UUID NULL REFERENCES public.user_programs(id) ON DELETE SET NULL,
  ADD COLUMN phase_id        UUID NULL REFERENCES public.program_phases(id) ON DELETE SET NULL,
  ADD COLUMN cycle_index     INT  NULL CHECK (cycle_index IS NULL OR cycle_index >= 1);

CREATE INDEX idx_workout_sessions_user_program ON public.workout_sessions (user_program_id);

ALTER TABLE public.programs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_programs  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- HELPERS (SECURITY DEFINER: read programs/friendships without RLS recursion)
-- ---------------------------------------------------------------------------

-- Own program, trainer's program for a tenant member, gym-shared (by link), or friend-shared.
CREATE OR REPLACE FUNCTION public.can_read_program(pid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.programs pr
    WHERE pr.id = pid
      AND (
        pr.owner_id = (SELECT auth.uid())
        OR pr.is_shared_with_gym
        OR pr.owner_id = (SELECT tenant_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        OR (
          pr.is_shared_with_friends
          AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.requester_id = (SELECT auth.uid()) AND f.addressee_id = pr.owner_id)
                OR (f.addressee_id = (SELECT auth.uid()) AND f.requester_id = pr.owner_id)
              )
          )
        )
      )
  );
$$;

-- A plan is readable when some program the caller can read has a phase using it.
CREATE OR REPLACE FUNCTION public.planning_in_readable_program(plan_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.program_phases ph
    WHERE ph.planning_id = plan_id AND public.can_read_program(ph.program_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_program(pid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.programs WHERE id = pid AND owner_id = (SELECT auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- PROGRAMS
-- ---------------------------------------------------------------------------
CREATE POLICY "programs: read accessible"
ON public.programs FOR SELECT TO authenticated
USING (public.can_read_program(id));

CREATE POLICY "programs: owner manages"
ON public.programs FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()) AND get_my_role() IN ('trainer', 'free', 'admin'))
WITH CHECK (owner_id = (SELECT auth.uid()) AND get_my_role() IN ('trainer', 'free', 'admin'));

-- ---------------------------------------------------------------------------
-- PROGRAM PHASES
-- ---------------------------------------------------------------------------
CREATE POLICY "program_phases: read via program"
ON public.program_phases FOR SELECT TO authenticated
USING (public.can_read_program(program_id));

-- Owners chain only plans they own.
CREATE POLICY "program_phases: owner manages"
ON public.program_phases FOR ALL TO authenticated
USING (public.owns_program(program_id))
WITH CHECK (
  public.owns_program(program_id)
  AND EXISTS (
    SELECT 1 FROM public.plannings p
    WHERE p.id = planning_id AND p.tenant_id = (SELECT auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- USER PROGRAMS (who follows what)
-- ---------------------------------------------------------------------------
CREATE POLICY "user_programs: read own"
ON public.user_programs FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_programs: follow own"
ON public.user_programs FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_read_program(program_id));

CREATE POLICY "user_programs: update own"
ON public.user_programs FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Trainers see and assign programs for their tenant members.
CREATE POLICY "user_programs: trainer reads tenant"
ON public.user_programs FOR SELECT TO authenticated
USING (
  get_my_role() = 'trainer'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND tenant_id = (SELECT auth.uid()))
);

CREATE POLICY "user_programs: trainer assigns to tenant"
ON public.user_programs FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'trainer'
  AND public.owns_program(program_id)
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND tenant_id = (SELECT auth.uid()))
);

CREATE POLICY "user_programs: trainer updates tenant"
ON public.user_programs FOR UPDATE TO authenticated
USING (
  get_my_role() = 'trainer'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND tenant_id = (SELECT auth.uid()))
);

-- ---------------------------------------------------------------------------
-- Plans inside a readable program must be readable too, or a follower sees an empty program.
-- ---------------------------------------------------------------------------
CREATE POLICY "plannings: read via program"
ON public.plannings FOR SELECT TO authenticated
USING (public.planning_in_readable_program(id));

CREATE POLICY "planning_days: read via program"
ON public.planning_days FOR SELECT TO authenticated
USING (public.planning_in_readable_program(planning_id));

CREATE POLICY "prescribed_exercises: read via program"
ON public.prescribed_exercises FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.planning_days pd
  WHERE pd.id = planning_day_id AND public.planning_in_readable_program(pd.planning_id)
));

CREATE POLICY "exercises: read via program"
ON public.exercises FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.prescribed_exercises pe
  JOIN public.planning_days pd ON pd.id = pe.planning_day_id
  WHERE pe.exercise_id = exercises.id AND public.planning_in_readable_program(pd.planning_id)
));
