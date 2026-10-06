# 7. Workflow, Security & Deployment

[Back to index](./IMPROVEMENTS.md)

---

This doc covers three areas that don't have enough material for their own file: developer workflow conventions, security hardening, and the deployment pipeline.

---

## Part 1: Developer Workflow & Conventions

### 1. GitHub Actions CI

**Effort: 1 hour | Impact: High**

Currently there are no quality gates — pushing to `main` auto-deploys to Vercel with no checks. Add `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
    branches: [main, dev]
  push:
    branches: [main, dev]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm typecheck
      # Uncomment when tests exist:
      # - run: pnpm test
```

### 2. Git Branch Strategy

```
main          <- production (Vercel auto-deploys)
dev           <- integration branch (manual merge to main)
feature/*     <- new features (PR into dev)
fix/*         <- bug fixes (PR into dev)
hotfix/*      <- production fixes (PR into main)
```

### 3. Commit Message Convention

```
<type>(<scope>): <short description>

Types:  feat, fix, refactor, style, docs, test, chore, perf
Scopes: auth, planning, workout, trainer, admin, free, i18n, rls, ui, edge
```

Examples:
```
feat(planning): add pre-submit validation for exercise selection
fix(auth): handle race condition on hard refresh
refactor(workout): extract ExerciseCardComponent
test(rls): add policy tests for friendship visibility
chore(deps): update Angular to 19.1
```

### 4. PR Checklist

Create `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Checklist

- [ ] New translation keys added to `i18n.dictionary.ts` (both EN and ES)
- [ ] New routes added to CLAUDE.md File Map
- [ ] New components use `ChangeDetectionStrategy.OnPush`
- [ ] New components are standalone (no modules)
- [ ] Derived state uses `computed()`, not `effect()`
- [ ] New Supabase queries respect tenant scoping
- [ ] New migrations follow Expand/Contract pattern
- [ ] Existing migration files were NOT modified
- [ ] Shared UI components used where applicable
- [ ] No `any` types introduced
- [ ] Service mutations return `Promise<string | null>`
- [ ] Loading states prevent double-submit on buttons
```

### 5. Add Useful `pnpm` Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm supabase:start\" \"pnpm start\"",
    "dev:full": "concurrently \"pnpm supabase:start\" \"pnpm exec supabase functions serve\" \"pnpm start\"",
    "db:types": "pnpm exec supabase gen types typescript --local > src/core/supabase/database.types.ts",
    "db:new-migration": "pnpm exec supabase migration new",
    "typecheck": "tsc --noEmit"
  }
}
```

### 6. Claude Code Permission Config

Create `.claude/settings.json` to reduce permission prompts during development:

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm *)",
      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(find *)",
      "Bash(grep *)",
      "Bash(wc *)",
      "Bash(ls *)"
    ]
  }
}
```

---

## Part 2: Security Hardening

### 4.1 Content Security Policy Headers

**Effort: 20 min | Impact: High**

Add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; img-src 'self' data:; font-src 'self'"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

**What this does:**
- `default-src 'self'` — only load resources from your own domain
- `script-src 'self'` — no inline scripts, no external scripts
- `connect-src ... https://*.supabase.co` — allows Supabase API calls
- `X-Frame-Options: DENY` — prevents your site from being embedded in iframes (clickjacking protection)

### 4.2 SVG Sanitization

**Effort: 1 hour | Impact: Medium**

`profiles.tenant_logo_svg` stores raw SVG and is rendered using `DomSanitizer.bypassSecurityTrustHtml()` in `TenantBrandingComponent`. The database has a 64KB size limit, but there's no XSS sanitization — a malicious SVG could include `<script>` tags or event handlers (`onload`, `onerror`).

**Options:**
1. **Server-side sanitization:** Add a Supabase DB trigger that strips dangerous elements on INSERT/UPDATE
2. **Client-side sanitization:** Use a library like DOMPurify before rendering
3. **Allow-list approach:** Only permit `<svg>`, `<path>`, `<circle>`, `<rect>`, `<g>`, `<text>` elements

Option 3 is the simplest and most secure for logos.

### 4.3 Security Documentation

Add to CLAUDE.md:

```markdown
### Security Notes
- Auth uses Supabase JWTs (bearer tokens in localStorage), not cookies.
  CSRF protection is not needed.
- SVG uploads are size-limited (64KB) but **not sanitized for XSS**.
  This is a known gap — see docs/07-workflow-security-deploy.md.
- RLS is the primary access control layer. Route guards are a UX convenience,
  not a security boundary. Never rely on guards alone to protect data.
```

---

## Part 3: Edge Function Improvements

### 5.1 Add Duplicate Email Check

**Effort: 20 min | Impact: Medium**

`supabase/functions/invite-client/index.ts` doesn't check if the email is already registered. Inviting the same email twice creates a second invite link and may overwrite the first user's session.

Add before the `generateLink` call:

```typescript
const { data: existingUsers } = await adminClient.auth.admin.listUsers();
const alreadyExists = existingUsers?.users?.some(
  u => u.email?.toLowerCase() === email.toLowerCase()
);
if (alreadyExists) {
  return new Response(
    JSON.stringify({ error: 'A user with this email already exists' }),
    { status: 409, headers: corsHeaders }
  );
}
```

### 5.2 Add Rate Limiting

**Effort: 1 hour | Impact: Medium**

If a trainer's account is compromised, the attacker could spam invite emails. Add a simple counter:

```typescript
const { count } = await adminClient
  .from('profiles')
  .select('*', { count: 'exact', head: true })
  .eq('tenant_id', callerProfile.id);

const MAX_INVITES_PER_TENANT = 100;
if ((count ?? 0) >= MAX_INVITES_PER_TENANT) {
  return new Response(
    JSON.stringify({ error: 'Tenant invite limit reached' }),
    { status: 429, headers: corsHeaders }
  );
}
```

### 5.3 Extract Error Helper

**Effort: 15 min | Impact: Low (readability)**

The function has many repeated `new Response(JSON.stringify({ error: '...' }), { status: N })` blocks. Extract:

```typescript
function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
```

Then: `return errorResponse('Invalid email address', 400);`

---

## Part 4: Production Deploy Checklist (Phases 7+8)

Use this checklist when deploying Phases 7 and 8 to production.

### Prerequisites

- [ ] Supabase project linked: `supabase link --project-ref <ref>`
- [ ] SITE_URL secret set: `supabase secrets set SITE_URL=https://your-vercel-url`

### Database (do first)

1. [ ] Push migrations: `supabase db push --project-ref <ref>`
   - This applies 7 new migrations
2. [ ] Open Supabase Studio and verify:
   - [ ] `invite_requests` table exists
   - [ ] `friendships` table exists
   - [ ] `admin` is a valid value in the `user_role` enum
3. [ ] Set your account to admin:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```

### Edge Functions

4. [ ] Deploy: `supabase functions deploy invite-client --project-ref <ref>`
5. [ ] Test: use admin portal to invite a test user, verify email arrives

### Supabase Auth Config (Dashboard)

6. [ ] Settings > Auth > URL Configuration:
   - [ ] Site URL = your production URL
   - [ ] Redirect URLs includes `https://your-vercel-url/register`

### Frontend

7. [ ] Merge to `main` (Vercel auto-deploys)
8. [ ] Smoke test:
   - [ ] Login as admin -> `/admin/requests` loads
   - [ ] Login as free user -> `/my-plan/planning` loads
   - [ ] Friend request flow: send, accept, view shared plan
   - [ ] Invite flow: admin invites user, link works, user registers
   - [ ] Workout dashboard: load plan, log exercise, finish session

### Rollback Plan

If something goes wrong:
- **Frontend:** Revert the merge on `main` (Vercel auto-redeploys)
- **Database:** The migrations only ADD columns/tables/policies — they don't remove anything. The old frontend will still work. If needed, manually drop the new tables via Supabase Studio.
- **Edge function:** Redeploy the previous version or disable the function in the dashboard.
