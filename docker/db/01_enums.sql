-- =============================================================================
-- 01_enums.sql
-- Application-wide enum domain types.
-- =============================================================================

CREATE TYPE user_role AS ENUM ('trainer', 'user', 'free');
CREATE TYPE muscle_intensity AS ENUM ('primary', 'secondary', 'tertiary');
CREATE TYPE tracking_mode AS ENUM ('standard', 'granular', 'failure');
