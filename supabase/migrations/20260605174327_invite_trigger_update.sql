-- Update handle_new_user to propagate tenant linkage from invite app_metadata.
-- Invites set raw_app_meta_data via the invite-client Edge Function (admin API).
-- Regular signups have no app_metadata → role defaults to 'free', tenant columns NULL.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, tenant_id, tenant_ref_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_app_meta_data->>'role')::user_role, 'free'),
    NULLIF(NEW.raw_app_meta_data->>'tenant_id', '')::uuid,
    NULLIF(NEW.raw_app_meta_data->>'tenant_ref_id', '')::uuid
  );
  RETURN NEW;
END;
$$;
