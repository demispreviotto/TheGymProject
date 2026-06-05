-- Phase 8: Free User Self-Service Planning + Friend Sharing

-- ─────────────────────────────────────────────
-- 1. RLS: free/admin users manage their own data
-- ─────────────────────────────────────────────

CREATE POLICY "free users manage own exercises"
ON public.exercises FOR ALL TO authenticated
USING  (get_my_role() IN ('free','admin') AND tenant_id = (SELECT auth.uid()))
WITH CHECK (get_my_role() IN ('free','admin') AND tenant_id = (SELECT auth.uid()));

CREATE POLICY "free users manage own plannings"
ON public.plannings FOR ALL TO authenticated
USING  (get_my_role() IN ('free','admin') AND tenant_id = (SELECT auth.uid()))
WITH CHECK (get_my_role() IN ('free','admin') AND tenant_id = (SELECT auth.uid()));

CREATE POLICY "free users manage own planning days"
ON public.planning_days FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.plannings p
  WHERE p.id = planning_id
    AND p.tenant_id = (SELECT auth.uid())
    AND get_my_role() IN ('free','admin')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.plannings p
  WHERE p.id = planning_id
    AND p.tenant_id = (SELECT auth.uid())
    AND get_my_role() IN ('free','admin')
));

CREATE POLICY "free users manage own prescribed exercises"
ON public.prescribed_exercises FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.planning_days pd
  JOIN public.plannings p ON p.id = pd.planning_id
  WHERE pd.id = planning_day_id
    AND p.tenant_id = (SELECT auth.uid())
    AND get_my_role() IN ('free','admin')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.planning_days pd
  JOIN public.plannings p ON p.id = pd.planning_id
  WHERE pd.id = planning_day_id
    AND p.tenant_id = (SELECT auth.uid())
    AND get_my_role() IN ('free','admin')
));

-- ─────────────────────────────────────────────
-- 2. Add friend-sharing flag to plannings
-- ─────────────────────────────────────────────

ALTER TABLE public.plannings
  ADD COLUMN is_shared_with_friends BOOLEAN DEFAULT FALSE NOT NULL;

-- ─────────────────────────────────────────────
-- 3. Friendships table
-- ─────────────────────────────────────────────

CREATE TABLE public.friendships (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','rejected')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see their friendships"
ON public.friendships FOR SELECT TO authenticated
USING (requester_id = (SELECT auth.uid()) OR addressee_id = (SELECT auth.uid()));

CREATE POLICY "users can send friend requests"
ON public.friendships FOR INSERT TO authenticated
WITH CHECK (requester_id = (SELECT auth.uid()));

CREATE POLICY "addressee can respond to request"
ON public.friendships FOR UPDATE TO authenticated
USING (addressee_id = (SELECT auth.uid()));

CREATE POLICY "requester can cancel request"
ON public.friendships FOR DELETE TO authenticated
USING (requester_id = (SELECT auth.uid()));

-- ─────────────────────────────────────────────
-- 4. RLS: friends can read each other's shared plans
-- ─────────────────────────────────────────────

CREATE POLICY "friends can read shared plans"
ON public.plannings FOR SELECT TO authenticated
USING (
  is_shared_with_friends = TRUE
  AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = (SELECT auth.uid()) AND f.addressee_id = tenant_id)
        OR
        (f.addressee_id = (SELECT auth.uid()) AND f.requester_id = tenant_id)
      )
  )
);
