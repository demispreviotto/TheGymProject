-- =============================================================================
-- 03_rls.sql
-- Row-Level Security policy stubs for local development.
--
-- RLS is ENABLED on all tables so the local schema matches production shape,
-- but a blanket USING (TRUE) bypass policy is applied so Docker-local queries
-- succeed without an active auth session.
--
-- Production Supabase instance carries the real restrictive policies applied
-- via Supabase Studio / dashboard migrations — do NOT replicate them here.
-- =============================================================================

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises           ENABLE ROW LEVEL SECURITY;
ALTER TABLE plannings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_days       ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescribed_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs        ENABLE ROW LEVEL SECURITY;

-- Local bypass: allow the connected role (gymuser) full access.
CREATE POLICY local_dev_bypass ON profiles            FOR ALL TO gymuser USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY local_dev_bypass ON exercises           FOR ALL TO gymuser USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY local_dev_bypass ON plannings           FOR ALL TO gymuser USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY local_dev_bypass ON planning_days       FOR ALL TO gymuser USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY local_dev_bypass ON prescribed_exercises FOR ALL TO gymuser USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY local_dev_bypass ON workout_sessions    FOR ALL TO gymuser USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY local_dev_bypass ON workout_logs        FOR ALL TO gymuser USING (TRUE) WITH CHECK (TRUE);
