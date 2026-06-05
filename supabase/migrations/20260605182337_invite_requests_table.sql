-- -----------------------------------------------------------------------
-- invite_requests: free users submit requests; admin approves/rejects
-- -----------------------------------------------------------------------
CREATE TABLE public.invite_requests (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id            UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invitee_email           TEXT NOT NULL,
  invitee_name            TEXT NOT NULL,
  reason                  TEXT NOT NULL,
  accepted_responsibility BOOLEAN NOT NULL DEFAULT FALSE,
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id             UUID REFERENCES public.profiles(id),
  reviewer_note           TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at             TIMESTAMPTZ
);

ALTER TABLE public.invite_requests ENABLE ROW LEVEL SECURITY;

-- Requester inserts their own request
CREATE POLICY "requesters can insert own invite requests"
ON public.invite_requests FOR INSERT TO authenticated
WITH CHECK (requester_id = (SELECT auth.uid()));

-- Requester reads their own; admin reads all
CREATE POLICY "requesters and admin can read invite requests"
ON public.invite_requests FOR SELECT TO authenticated
USING (requester_id = (SELECT auth.uid()) OR get_my_role() = 'admin');

-- Admin approves / rejects
CREATE POLICY "admin can update invite requests"
ON public.invite_requests FOR UPDATE TO authenticated
USING (get_my_role() = 'admin')
WITH CHECK (get_my_role() = 'admin');

-- -----------------------------------------------------------------------
-- Extend existing profiles RLS: admin can read and update all profiles
-- -----------------------------------------------------------------------
CREATE POLICY "admin can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (get_my_role() = 'admin');

CREATE POLICY "admin can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (get_my_role() = 'admin')
WITH CHECK (get_my_role() = 'admin');

-- -----------------------------------------------------------------------
-- Update handle_new_user trigger:
--   - admin-invited trainers automatically get a tenants row
--   - all roles/tenant linkage now read from raw_app_meta_data
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role       user_role;
  v_tenant_id  UUID;
  v_name       TEXT;
BEGIN
  v_role := COALESCE((NEW.raw_app_meta_data->>'role')::user_role, 'free');
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Auto-create a tenants row for newly invited trainers
  IF v_role = 'trainer' THEN
    INSERT INTO public.tenants (owner_id, name)
    VALUES (NEW.id, v_name)
    RETURNING id INTO v_tenant_id;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, tenant_id, tenant_ref_id)
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_role,
    NULLIF(NEW.raw_app_meta_data->>'tenant_id', '')::uuid,
    v_tenant_id   -- NULL for non-trainer roles
  );
  RETURN NEW;
END;
$$;
