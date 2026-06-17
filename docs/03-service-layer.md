# 3. Service Layer & Error Handling

[Back to index](./IMPROVEMENTS.md)

---

## What's Good Already

- All services use `inject(SUPABASE_CLIENT)` — no raw client in components
- State is stored in signals, derived state uses `computed()` — no `effect()` anywhere
- Mutations follow a consistent `Promise<string | null>` return pattern
- Immutable updates: all `.update()` calls use object spreads, never in-place mutation

This doc covers four improvements to make the service layer more robust.

---

## 1. Add Error Recovery with State Rollback

**Effort: 1 hour | Impact: High**

### The Problem

When a mutation fails (e.g., updating a user's role), the error message is shown to the user, but the local signal state may already have been updated optimistically. The user sees the error AND the UI shows the change as if it succeeded.

Current pattern in `admin-users.component.ts`:

```typescript
async updateRole(user: Profile, newRole: UserRole): Promise<void> {
  const { error } = await this.supabase
    .from('profiles').update({ role: newRole }).eq('id', user.id);
  if (error) { this.actionError.set(error.message); return; }
  // Local state updated only on success — this is fine
  this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: newRole } : u));
}
```

This particular component updates state only on success, which is correct. But some components in the codebase update state before the async call, or don't reload on failure. The pattern should be consistent.

### The Fix

Adopt this standard pattern across all mutation methods:

```typescript
async updateRole(user: Profile, newRole: UserRole): Promise<void> {
  this.actionError.set(null);
  const { error } = await this.supabase
    .from('profiles').update({ role: newRole }).eq('id', user.id);
  if (error) {
    this.actionError.set(error.message);
    await this.loadUsers();  // <-- reload from DB to guarantee consistent state
    return;
  }
  this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: newRole } : u));
}
```

### Where to Apply

- `src/features/admin/users/admin-users.component.ts` — `updateRole()`, `toggleActive()`
- `src/features/trainer/clients/client-detail-sheet/client-detail-sheet.component.ts` — plan reassignment, active toggle
- `src/features/trainer/planning/planning-form/planning-form.component.ts` — `submit()`
- `src/features/profile/profile-page/profile-page.component.ts` — branding save

---

## 2. Add Transaction Safety for Multi-Step Mutations

**Effort: 2 hours | Impact: Medium**

### The Problem

`PlanningService.update()` performs three sequential Supabase calls:

1. Update the planning's metadata (title, use_auto_1rm)
2. Delete all existing days (cascade deletes prescribed exercises)
3. Re-insert new days and exercises

If step 3 fails partway through, the planning exists with its metadata updated but has no days. The user sees an empty plan.

### Option A: Supabase RPC Function (Recommended)

Wrap the whole operation in a PostgreSQL function that runs as a single transaction:

```sql
CREATE OR REPLACE FUNCTION update_planning_with_days(
  p_id UUID,
  p_title TEXT,
  p_use_auto_1rm BOOLEAN,
  p_days JSONB  -- [{ day_number, exercises: [{ exercise_id, ... }] }]
) RETURNS void AS $$
BEGIN
  -- All three steps run inside one transaction
  UPDATE plannings SET title = p_title, use_auto_1rm = p_use_auto_1rm WHERE id = p_id;
  DELETE FROM planning_days WHERE planning_id = p_id;
  -- Insert days and exercises from the JSONB payload
  -- (loop over jsonb_array_elements, insert into planning_days and prescribed_exercises)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then call it from the service:

```typescript
const { error } = await this.supabase.rpc('update_planning_with_days', {
  p_id: id,
  p_title: payload.title,
  p_use_auto_1rm: payload.use_auto_1rm,
  p_days: JSON.stringify(payload.days),
});
```

### Option B: Re-Fetch on Failure

If the RPC approach is too much work right now, at minimum re-fetch the plan state on failure so the UI stays consistent:

```typescript
async update(id: string, payload: PlanningPayload): Promise<string | null> {
  // ... steps 1, 2, 3 ...
  if (anyStepFailed) {
    await this.loadFull(id);  // reload whatever actually got saved
    return 'Partial save failed. The plan has been reloaded.';
  }
}
```

---

## 3. Normalize Error Returns to Typed Objects

**Effort: 1 hour | Impact: Medium**

### The Problem

Services return `string | null` for errors. This works, but you lose the error code (needed for i18n translations) and can't do conditional logic (e.g., distinguish an RLS violation from a network error).

### The Fix

Define a result type:

```typescript
// src/core/types/result.ts
export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };
```

Usage in a service:

```typescript
async create(payload: CreatePayload): Promise<ServiceResult> {
  const { error } = await this.supabase.from('exercises').insert(payload);
  if (error) return { ok: false, code: error.code, message: error.message };
  await this.load();
  return { ok: true, data: undefined };
}
```

Usage in a component:

```typescript
const result = await this.exerciseService.create(payload);
if (!result.ok) {
  // Now you can translate by code, retry on specific errors, etc.
  this.error.set(this.lang.t(`error.${result.code}`) ?? result.message);
  return;
}
```

### Migration Strategy

This is a gradual change. Start with new code, then migrate existing services one at a time. The old `string | null` pattern doesn't need to be ripped out all at once.

---

## 4. Add Loading States to All Mutations

**Effort: 30 min | Impact: Medium**

### The Problem

Several components don't disable the submit button while an async operation is in progress. If the user clicks "Save" twice quickly, two mutations fire.

### The Standard Pattern

Every component with a submit/save action should have:

```typescript
readonly saving = signal(false);

async submit(): Promise<void> {
  if (this.saving()) return;  // guard against double-click
  this.saving.set(true);
  try {
    const err = await this.service.create(payload);
    if (err) this.error.set(err);
  } finally {
    this.saving.set(false);
  }
}
```

In the template:

```html
<button [disabled]="saving()" (click)="submit()">
  @if (saving()) {
    Saving...
  } @else {
    Save
  }
</button>
```

### Where to Apply

Check every component that has a submit/save button:
- `planning-form.component.ts`
- `exercise-form.component.ts`
- `profile-page.component.ts` (branding save)
- `my-friends.component.ts` (send friend request)
- `admin-invite-requests.component.ts` (approve/reject)
- `admin-users.component.ts` (invite form)
