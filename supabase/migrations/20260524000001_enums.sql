-- =============================================================================
-- 20260524000001_enums.sql
-- Application-wide enum domain types.
-- =============================================================================

CREATE TYPE public.user_role       AS ENUM ('trainer', 'user', 'free');
CREATE TYPE public.muscle_intensity AS ENUM ('primary', 'secondary', 'tertiary');
CREATE TYPE public.tracking_mode   AS ENUM ('standard', 'granular', 'failure');
