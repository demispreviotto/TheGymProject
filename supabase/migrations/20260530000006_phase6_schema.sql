-- =============================================================================
-- Phase 6 schema: tenant extraction, localization, protocol sharing (expand only)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create tenants table (member_read policy added after profiles.tenant_ref_id exists)
-- ---------------------------------------------------------------------------
CREATE TABLE public.tenants (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  logo_svg    TEXT CHECK (octet_length(logo_svg) <= 65535),
  primary_hex VARCHAR(7) DEFAULT '#EF4444' NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_owner_all"
  ON public.tenants
  USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Expand profiles: new columns (tenant_id and inline branding columns kept intact)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN tenant_ref_id       UUID REFERENCES public.tenants(id) NULL,
  ADD COLUMN preferred_language  VARCHAR(2) DEFAULT 'en' NOT NULL,
  ADD COLUMN assigned_trainer_id UUID REFERENCES public.profiles(id) NULL;

-- ---------------------------------------------------------------------------
-- 3. Now that profiles.tenant_ref_id exists, add the member-read policy
-- ---------------------------------------------------------------------------
CREATE POLICY "tenant_member_read"
  ON public.tenants FOR SELECT TO authenticated
  USING (
    id IN (SELECT tenant_ref_id FROM public.profiles WHERE id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 4. plannings: sharing flag + public read policy for shared plans
-- ---------------------------------------------------------------------------
ALTER TABLE public.plannings
  ADD COLUMN is_shared_with_gym BOOLEAN DEFAULT FALSE NOT NULL;

CREATE POLICY "plannings: read shared"
  ON public.plannings FOR SELECT TO authenticated
  USING (is_shared_with_gym = true);
