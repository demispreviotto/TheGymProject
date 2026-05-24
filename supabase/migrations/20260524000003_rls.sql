-- =============================================================================
-- 20260524000003_rls.sql
-- Production Row-Level Security policies.
-- All policies use auth.uid() (Supabase-native) and get_my_role() to avoid
-- recursive lookups on the profiles table.
-- =============================================================================

ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plannings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_days        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescribed_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs         ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------

-- Every user can read and update their own profile.
CREATE POLICY "profiles: read own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trainers can read profiles that belong to their tenant.
CREATE POLICY "profiles: trainer reads tenant members"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    get_my_role() = 'trainer'
    AND tenant_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- EXERCISES
-- ---------------------------------------------------------------------------

-- Global exercises (tenant_id IS NULL) are readable by all authenticated users.
CREATE POLICY "exercises: read global"
  ON public.exercises FOR SELECT TO authenticated
  USING (tenant_id IS NULL);

-- Trainers have full control over their own tenant's exercises.
CREATE POLICY "exercises: trainer manages own"
  ON public.exercises FOR ALL TO authenticated
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

-- Tenant members (users/free) can read their trainer's exercises.
CREATE POLICY "exercises: tenant members read"
  ON public.exercises FOR SELECT TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- PLANNINGS
-- ---------------------------------------------------------------------------

-- Trainers own and manage their plannings.
CREATE POLICY "plannings: trainer manages own"
  ON public.plannings FOR ALL TO authenticated
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

-- Users can read plannings that belong to their trainer.
CREATE POLICY "plannings: users read own trainer"
  ON public.plannings FOR SELECT TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- PLANNING DAYS
-- ---------------------------------------------------------------------------

CREATE POLICY "planning_days: access via planning"
  ON public.planning_days FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.plannings p
      WHERE p.id = planning_id
        AND (
          p.tenant_id = auth.uid()
          OR p.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------------
-- PRESCRIBED EXERCISES
-- ---------------------------------------------------------------------------

CREATE POLICY "prescribed_exercises: access via planning"
  ON public.prescribed_exercises FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.planning_days pd
      JOIN public.plannings p ON p.id = pd.planning_id
      WHERE pd.id = planning_day_id
        AND (
          p.tenant_id = auth.uid()
          OR p.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------------
-- WORKOUT SESSIONS
-- ---------------------------------------------------------------------------

-- Users manage their own sessions.
CREATE POLICY "workout_sessions: manage own"
  ON public.workout_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trainers can read sessions from their tenant members.
CREATE POLICY "workout_sessions: trainer reads tenant"
  ON public.workout_sessions FOR SELECT TO authenticated
  USING (
    get_my_role() = 'trainer'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_id AND tenant_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- WORKOUT LOGS
-- ---------------------------------------------------------------------------

-- Users manage logs that belong to their own sessions.
CREATE POLICY "workout_logs: manage via own session"
  ON public.workout_logs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );

-- Trainers can read logs from their tenant members' sessions.
CREATE POLICY "workout_logs: trainer reads tenant"
  ON public.workout_logs FOR SELECT TO authenticated
  USING (
    get_my_role() = 'trainer'
    AND EXISTS (
      SELECT 1
      FROM public.workout_sessions ws
      JOIN public.profiles p ON p.id = ws.user_id
      WHERE ws.id = session_id AND p.tenant_id = auth.uid()
    )
  );
