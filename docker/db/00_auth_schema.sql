-- =============================================================================
-- 00_auth_schema.sql
-- Local dev mock of Supabase's internal auth schema.
-- Production uses Supabase-managed auth.users; this mirrors the minimum
-- shape required for FK references to compile and resolve locally.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT UNIQUE NOT NULL,
  encrypted_password    TEXT,
  email_confirmed_at    TIMESTAMPTZ DEFAULT NOW(),
  raw_app_meta_data     JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_user_meta_data    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mirrors the auth.uid() helper Supabase injects at runtime.
-- In local dev, set via: SET LOCAL app.current_user_id = '<uuid>';
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
  LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
$$;
