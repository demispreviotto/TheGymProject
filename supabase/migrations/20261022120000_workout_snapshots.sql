-- =============================================================================
-- 20261022120000_workout_snapshots.sql
-- Expand step: remember what was prescribed when a workout was logged, so later
-- plan edits do not rewrite the meaning of past sessions. All columns nullable;
-- rows written before this migration simply have no snapshot.
-- =============================================================================
ALTER TABLE public.workout_logs
  ADD COLUMN target_reps   INT NULL CHECK (target_reps   IS NULL OR target_reps   > 0),
  ADD COLUMN target_rounds INT NULL CHECK (target_rounds IS NULL OR target_rounds > 0);

-- 1-based position of the day inside the plan's day list at logging time
-- (day_number alone changes meaning once days are added or removed).
ALTER TABLE public.workout_sessions
  ADD COLUMN day_position INT NULL CHECK (day_position IS NULL OR day_position > 0);

-- loadLastLog filters logs by exercise
CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise ON public.workout_logs (exercise_id);
