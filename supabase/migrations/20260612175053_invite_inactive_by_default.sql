-- Invited users start as inactive until they complete registration (/register page).
-- The register component sets is_active = true after the user sets their password.
-- This gives admins an accurate view of who has actually onboarded vs. who is pending.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, tenant_id, tenant_ref_id, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_app_meta_data->>'role')::user_role, 'free'),
    NULLIF(NEW.raw_app_meta_data->>'tenant_id', '')::uuid,
    NULLIF(NEW.raw_app_meta_data->>'tenant_ref_id', '')::uuid,
    FALSE  -- stays false until the user completes /register
  );
  RETURN NEW;
END;
$$;
