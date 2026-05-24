-- Expand: add assigned_planning_id to profiles so trainers can assign a planning to each client.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_planning_id UUID REFERENCES public.plannings(id) ON DELETE SET NULL NULL;

-- Trainers can update assigned_planning_id for clients that belong to their tenant.
CREATE POLICY "trainer can assign planning to own clients"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'trainer'
    AND tenant_id = auth.uid()
  )
  WITH CHECK (
    public.get_my_role() = 'trainer'
    AND tenant_id = auth.uid()
  );
