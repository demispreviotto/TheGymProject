-- Whether an invited account ever finished registering, decided from the auth record.
--
-- /register sets a password (updateUser), so an auth user without one is still a pending
-- invitation. profiles.is_active cannot tell: an admin can flip that toggle by hand, and a
-- trainer can deactivate a client who did register. Expand only: two new functions, no
-- existing object changes.

-- Used by the invite-client edge function (service role) to decide whether to re-invite.
CREATE OR REPLACE FUNCTION public.is_invite_pending(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT COALESCE(u.encrypted_password, '') = '' FROM auth.users u WHERE u.id = p_user_id),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_invite_pending(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_invite_pending(uuid) TO service_role;

-- Used by the app to mark pending invitations in the client list (trainer) and the users
-- table (admin). Only ids the caller can already read in profiles are returned: an admin
-- sees every pending user, a trainer only their own clients.
CREATE OR REPLACE FUNCTION public.pending_invitees()
RETURNS TABLE (user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE COALESCE(u.encrypted_password, '') = ''
    AND (
      public.get_my_role() = 'admin'
      OR (public.get_my_role() = 'trainer' AND p.tenant_id = auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.pending_invitees() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pending_invitees() TO authenticated;
