# 1. Claude Instructions & CLAUDE.md Improvements

[Back to index](./IMPROVEMENTS.md)

---

## The Problem

The current `CLAUDE.md` is thorough as a project blueprint, but it's 370+ lines and buries the most frequently needed info (commands, test accounts, file locations) deep in the document. Claude reads it at the start of every conversation, so the top matters most.

These changes make CLAUDE.md more effective as an AI instruction file without losing any of the existing architecture documentation.

---

## 1. Add a Quick Reference Section at the Top

**Why:** The info Claude needs most often (how to run things, where files live) should be first.

**Where to add:** Right after the title line, before "Current Development State".

```markdown
## Quick Reference

### Commands
| Action | Command |
|--------|---------|
| Install deps | `pnpm install` |
| Start Supabase | `pnpm supabase:start` |
| Start Angular | `pnpm start` |
| Reset DB | `pnpm supabase:reset` |
| Edge functions | `pnpm exec supabase functions serve` |
| Build | `pnpm build` |
| Type check | `pnpm exec ng build --configuration=development --no-serve` |

### Test Accounts (local only)
| Email | Password | Role |
|-------|----------|------|
| trainer@test.local | password123 | trainer |
| user@test.local | password123 | user |
| free@test.local | password123 | free |
| admin@test.local | password123 | admin |

### File Ownership Quick Map
| Need to change... | Edit... |
|-------------------|---------|
| Auth flow / profile loading | `src/core/auth/auth.service.ts` |
| Route structure | `src/app/app.routes.ts` |
| New translation key | `src/core/i18n/i18n.dictionary.ts` |
| Supabase schema | `supabase/migrations/` (new file, never edit existing) |
| Shared component | `src/shared/components/` or `src/shared/ui/` |
| New feature page | `src/features/<role>/` |
```

---

## 2. Add an Anti-Pattern Watchlist

**Why:** The existing constraints in Section 0 are broad. These specific rules catch the most common mistakes Claude makes with this stack.

**Where to add:** At the end of Section 0 ("Critical Execution Constraints").

```markdown
### Anti-Pattern Watchlist
- **Never use `effect()` for state synchronization.** All derived state must use `computed()`.
- **Never use `ngOnInit` to load data that depends on route params.** Use `input()` with
  `withComponentInputBinding()` or inject `ActivatedRoute` and use `toSignal()`.
- **Never add `async` pipes in templates.** All async data should be converted to signals
  at the service boundary.
- **Never create new modules.** All components are standalone.
- **Never use `@Input()` / `@Output()` decorators.** Use the `input()`, `input.required()`,
  `output()`, and `model()` signal-based APIs.
- **Never mutate signal arrays in place.** Always use `.update()` with a new array/object spread.
- **Never use string-based route navigation for role redirects.** Use `Router.createUrlTree()` in guards.
- **Never edit existing migration files.** Always create a new migration.
- **Never use `any` — not even in catch blocks.** Use `unknown` and narrow.
```

---

## 3. Add a Component Creation Template

**Why:** Every component in the codebase follows a consistent pattern. Making it explicit prevents drift.

**Where to add:** New subsection in Section 2 ("Coding Standards").

```markdown
### New Component Template

Every new component must follow this structure:

```typescript
import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';

@Component({
  selector: 'app-<feature-name>',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [/* only what's used */],
  template: `
    <!-- template here -->
  `,
})
export class <FeatureName>Component {
  // 1. Injected dependencies
  private readonly auth = inject(AuthService);

  // 2. Signals (state)
  readonly loading = signal(true);

  // 3. Computed (derived state)
  readonly isReady = computed(() => !this.loading());

  // 4. Lifecycle / constructor
  constructor() { this.load(); }

  // 5. Public methods (template-bound)
  // 6. Private methods
}
```

**Rules:**
- Inline templates for components under 200 lines. Extract to `.html` file above 200.
- Inline styles only for <5 rules. Otherwise, Tailwind classes exclusively.
- No `ngOnInit`. Use `constructor()` or `afterNextRender()`.
- Maximum 300 lines per component file. If larger, extract sub-components.
```

---

## 4. Add a Service Creation Template

**Where to add:** New subsection in Section 2, right after the component template.

```markdown
### New Service Template

```typescript
@Injectable({ providedIn: 'root' })
export class <Name>Service {
  private readonly supabase = inject(SUPABASE_CLIENT);

  // Public signal state
  readonly items = signal<Item[]>([]);

  // Derived state
  readonly count = computed(() => this.items().length);

  // Mutations return Promise<string | null> (null = success, string = error message)
  async create(payload: CreatePayload): Promise<string | null> {
    const { error } = await this.supabase.from('table').insert(payload);
    if (error) return error.message;
    await this.load();
    return null;
  }

  async load(): Promise<void> {
    const { data } = await this.supabase.from('table').select('*');
    this.items.set((data ?? []) as Item[]);
  }
}
```

**Rules:**
- Every mutation method returns `Promise<string | null>`.
- On error, return the message string. Never throw.
- After a successful mutation, reload the source signal (don't rely on optimistic-only updates).
- Never expose the Supabase client to components.
```

---

## 5. Add a Migration Convention

**Where to add:** New subsection after the Database Schema section.

```markdown
### Migration Naming Convention

```
supabase/migrations/YYYYMMDDHHMMSS_<descriptive_slug>.sql
```

- One concern per migration file.
- Always use `IF NOT EXISTS` / `IF EXISTS` for idempotency.
- Include a comment header: `-- Phase X: <what and why>`
- Never modify production-applied migrations (files listed as "Production" in this doc).
- Test locally with `pnpm supabase:reset` before committing.
```

---

## 6. Add a Shared UI Decision Tree

**Why:** Several shared components exist but aren't always used. For example, `WorkoutDashboardComponent` manually builds a bottom drawer instead of using the existing `HlmSheetComponent`.

**Where to add:** New section after Coding Standards.

```markdown
### Shared UI — What to Use

| I need... | Use this | Not this |
|-----------|----------|----------|
| Action button with icon | `<app-icon-button>` | Raw `<button>` + `<app-icon>` |
| Empty list state | `<app-empty-state>` | Inline "No items" text |
| Loading skeleton | `<app-skeleton>` | Inline `@for` animate-pulse divs |
| Boolean toggle | `<app-toggle>` | Inline `role="switch"` buttons |
| Page title + action | `<app-page-header>` | Custom header markup |
| Slide-over panel | `<hlm-sheet>` | Manual fixed overlay + backdrop |
| Date display | `formatDate(iso)` | Inline `toLocaleDateString` |
| Share/copy URL | `shareOrCopy()` | Manual `navigator.share` |
| Copy with "Copied!" feedback | `copyWithTimeout()` | Manual clipboard + `setTimeout` |
```

---

## 7. Condense the Phase Tracking Table

**Why:** The current phase status table is 20+ lines and hard to scan. Replace with:

```markdown
## Deployment Status

| Phase | What | Prod | Local |
|-------|------|------|-------|
| 1-6 | Infrastructure through i18n + tenants | Yes | Yes |
| 7 | Invitations & access control | **No** | Yes |
| 8 | Free-user planning + friend sharing | **No** | Yes |
| 8.1 | Rest timer | **No** | Yes |
| 9 | Corporate gym tier | Not started | Not started |

**Blocking production deploy:** Phases 7+8 migrations + edge function deploy.
```

Keep the detailed per-phase breakdowns further down in the file for reference.

---

## 8. Update `clauderc.json`

The current `clauderc.json` has a minimal instruction string. Expand it to capture the most important rules:

```json
{
  "memory": {
    "instructions": "This is a modern Angular 19 SPA using standalone components, Signal-based reactivity, and Supabase backend. Follow CLAUDE.md strictly. Key rules: no effect(), no NgModules, no @Input/@Output decorators (use signal-based input()/output()), no any types, OnPush change detection on every component, services return Promise<string | null> for mutations. Use pnpm exclusively. Check the Shared UI decision tree in CLAUDE.md before creating custom UI."
  }
}
```

---

## 9. Proposed CLAUDE.md Section Order

Reorder so the most-referenced info comes first:

```
1. Quick Reference        (NEW — commands, test accounts, file map)
2. Deployment Status      (existing, condensed)
3. Execution Constraints  (existing + anti-pattern watchlist)
4. Technical Stack        (existing)
5. Coding Standards       (existing + component/service templates)
6. Shared UI Guide        (NEW — decision tree)
7. Database Schema        (existing)
8. Codebase File Map      (existing, keep updated)
9. Algorithmic Specs      (existing)
10. Migration Convention  (NEW)
11. Security Notes        (NEW)
```

This puts the "I need to do something right now" info at the top and the "reference when building something specific" info at the bottom.
