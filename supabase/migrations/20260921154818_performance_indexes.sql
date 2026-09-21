-- Phase: Performance — add indexes for common query patterns
-- flagged in code review PR #1 (docs/05-database.md #1)

-- Profile lookups by tenant (trainer loading clients; also covers the
-- in-progress tenant_ref_id expand/contract migration)
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id
  ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_ref_id
  ON profiles(tenant_ref_id);

-- Planning queries scoped to tenant
CREATE INDEX IF NOT EXISTS idx_plannings_tenant_id
  ON plannings(tenant_id);

-- Workout history queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_planning
  ON workout_sessions(user_id, planning_id, completed_at DESC);

-- Friendship lookups (both directions)
CREATE INDEX IF NOT EXISTS idx_friendships_requester
  ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee
  ON friendships(addressee_id);

-- Invite request filtering by status
CREATE INDEX IF NOT EXISTS idx_invite_requests_status
  ON invite_requests(status);
