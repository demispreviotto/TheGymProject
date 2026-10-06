-- Security: prevent authenticated users from escalating their own role via RLS.
-- flagged in code review PR #1 (docs/05-database.md #2)
--
-- The previous "profiles: update own" policy let a user update any column on
-- their own row, including `role`. Route guards hide admin-only pages in the
-- UI, but RLS is the actual access boundary -- a user could call the
-- Supabase client directly and set role = 'admin' on their own profile.
--
-- The separate "admin can update all profiles" policy (added in
-- 20260605182337_invite_requests_table.sql) is untouched and still lets
-- admins update anyone's row, including role.

DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;

CREATE POLICY "profiles: update own profile (role locked)"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    OR get_my_role() = 'admin'
  )
);
