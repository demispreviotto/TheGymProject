-- Any authenticated user can read any profile.
-- Required for: "Add friend" email lookup (before a friendship exists),
-- and displaying requester/addressee names in the friendship UI.
CREATE POLICY "authenticated users can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);
