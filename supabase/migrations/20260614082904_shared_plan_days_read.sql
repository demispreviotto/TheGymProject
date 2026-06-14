-- Friends need read access to days, exercises, and exercise definitions
-- of plans shared with them (is_shared_with_friends = true).

CREATE POLICY "friends can read shared planning days"
ON public.planning_days FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.plannings p
  WHERE p.id = planning_id
    AND p.is_shared_with_friends = TRUE
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = (SELECT auth.uid()) AND f.addressee_id = p.tenant_id)
          OR
          (f.addressee_id = (SELECT auth.uid()) AND f.requester_id = p.tenant_id)
        )
    )
));

CREATE POLICY "friends can read shared prescribed exercises"
ON public.prescribed_exercises FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.planning_days pd
  JOIN public.plannings p ON p.id = pd.planning_id
  WHERE pd.id = planning_day_id
    AND p.is_shared_with_friends = TRUE
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = (SELECT auth.uid()) AND f.addressee_id = p.tenant_id)
          OR
          (f.addressee_id = (SELECT auth.uid()) AND f.requester_id = p.tenant_id)
        )
    )
));

-- Allows reading exercises referenced in a shared plan even if they are private to the owner.
CREATE POLICY "friends can read exercises from shared plans"
ON public.exercises FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.prescribed_exercises pe
  JOIN public.planning_days pd ON pd.id = pe.planning_day_id
  JOIN public.plannings p ON p.id = pd.planning_id
  WHERE pe.exercise_id = exercises.id
    AND p.is_shared_with_friends = TRUE
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = (SELECT auth.uid()) AND f.addressee_id = p.tenant_id)
          OR
          (f.addressee_id = (SELECT auth.uid()) AND f.requester_id = p.tenant_id)
        )
    )
));