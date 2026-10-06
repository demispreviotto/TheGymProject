# 5. Database, RLS & Migrations

[Back to index](./IMPROVEMENTS.md)

---

## What's Good Already

- 13 well-ordered migrations following the Expand/Contract pattern
- Comprehensive RLS policies using a `get_my_role()` helper function
- FK cascades properly configured (deleting a planning cascades to days and prescribed exercises)
- `IF NOT EXISTS` used in Phase 8+ migrations

This doc covers four improvements for performance, security, and completing deferred work.

---

## 1. Add Database Indexes

**Effort: 30 min | Impact: High**

### The Problem

Beyond primary keys and unique constraints, there are no indexes. The app works fine now, but as data grows these queries will slow down noticeably:

- Trainer loading their client roster (filter `profiles` by `tenant_id`)
- User loading their workout history (filter `workout_sessions` by `user_id + planning_id`)
- Friend lookups (filter `friendships` by requester or addressee)

### The Fix

Create a new migration:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_performance_indexes.sql
-- Phase: Performance — add indexes for common query patterns

-- Profile lookups by tenant (trainer loading clients)
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

-- Workout log lookups by session
CREATE INDEX IF NOT EXISTS idx_workout_logs_session
  ON workout_logs(session_id);

-- Friendship lookups (both directions)
CREATE INDEX IF NOT EXISTS idx_friendships_requester
  ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee
  ON friendships(addressee_id);

-- Invite request filtering by status
CREATE INDEX IF NOT EXISTS idx_invite_requests_status
  ON invite_requests(status);
```

### How to Test

After creating the migration:

```bash
pnpm supabase:reset           # applies all migrations including new indexes
# Then verify with:
# Supabase Studio → SQL Editor → EXPLAIN ANALYZE SELECT ... FROM profiles WHERE tenant_id = '...'
```

You should see `Index Scan` instead of `Seq Scan` in the query plan.

---

## 2. Add RLS Policy for Profile Self-Update Restriction

**Effort: 20 min | Impact: Medium**

### The Problem

A user can call the Supabase client directly (e.g., from the browser console) and update their own profile — including changing their `role` field. While the route guards would still block them from seeing admin pages, they could set `role = 'admin'` and access admin-only RLS policies.

### The Fix

Add a migration that prevents non-admin users from changing their own role:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_restrict_role_self_update.sql
-- Security: prevent users from changing their own role

-- Drop existing update policy if it only checks id = auth.uid()
-- Then create a new one:
CREATE POLICY "users can update own profile but not role"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  -- The role in the UPDATE must match the current role (no change)
  -- UNLESS the caller is an admin
  role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  OR get_my_role() = 'admin'
);
```

### Why This Matters

RLS is the actual security boundary — route guards are just a UX convenience. If a user can bypass RLS to change their role, they can escalate to admin and access everything.

---

## 3. Add Soft Delete Pattern (Future)

**Effort: 1 hour | Impact: Low**

### The Problem

Currently, deleting a planning or exercise is a hard delete (`DELETE FROM plannings WHERE id = ?`). There's no audit trail and no way to recover accidentally deleted data.

### The Fix (when needed)

Add a `deleted_at` column to tables that support deletion:

```sql
ALTER TABLE plannings ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE exercises ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
```

Update RLS policies to only return non-deleted rows:

```sql
-- Add to existing SELECT policies:
AND deleted_at IS NULL
```

Update service queries:

```typescript
// Before
const { data } = await this.supabase.from('plannings').select('*');

// After
const { data } = await this.supabase.from('plannings').select('*').is('deleted_at', null);
```

The "delete" operation becomes an update:

```typescript
async softDelete(id: string): Promise<string | null> {
  const { error } = await this.supabase
    .from('plannings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return error.message;
  await this.loadPlannings();
  return null;
}
```

### When to Do This

This isn't urgent for MVP. Add it when users start asking "can I undo that delete?" or when you need an audit trail for compliance.

---

## 4. Complete the Expand/Contract Cycle

**Effort: 1 hour | Impact: Medium**

### The Problem

Phase 6 added a new `tenants` table and a `profiles.tenant_ref_id` column pointing to it. But the old `profiles.tenant_id` column (which points to `auth.users(id)`) still exists and is still used by 7 RLS policies. The plan was always to drop the old column once all code paths use the new one — but the contract step has been deferred since Phase 6.

This means:
- Two columns serve a similar purpose (`tenant_id` and `tenant_ref_id`)
- New developers get confused about which one to use
- The old inline branding columns (`tenant_name`, `tenant_logo_svg`, `tenant_primary_hex`) still exist on `profiles` even though branding now lives in the `tenants` table

### The Fix

Create a contract migration that:

1. **Rewrites the 7 RLS policies** to use `tenant_ref_id` with a join to `tenants.owner_id` instead of `tenant_id = auth.uid()`
2. **Drops `profiles.tenant_id`** (after verifying all code paths reference `tenant_ref_id`)
3. **Drops the inline branding columns** (`tenant_name`, `tenant_logo_svg`, `tenant_primary_hex`) since all code now reads from the `tenants` table via `auth.tenant()`

### Before You Start

Search the codebase for any remaining references to the old columns:

```bash
grep -r "tenant_id" src/ --include="*.ts" | grep -v "tenant_ref_id"
grep -r "tenant_name\|tenant_logo_svg\|tenant_primary_hex" src/ --include="*.ts"
```

If any code still uses the old columns, update it first.

### Risk

This is a breaking change for production. Deploy the contract migration at the same time as the frontend code that no longer references the old columns. The Phase 7+8 production deploy is a good moment to bundle this in.
