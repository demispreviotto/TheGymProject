-- Add 'admin' value to the user_role enum.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block in Postgres,
-- so this must be the only statement in this migration.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
