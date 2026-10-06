# TheGymProject: Improvement Roadmap

> **Audience:** Un perro bachicha
> **Branch:** `feedback`
> **Date:** 2026-06-17

---

## What Is This?

This is a full review of the codebase with concrete, prioritized recommendations for improving the project before and after the Phases 7+8 production deploy. Each topic has its own doc so you can read (or assign) them independently.

---

## Where We Stand

The project is solid. Signal-based state management, clean service/component separation, comprehensive RLS policies, multi-tenant theming, and i18n all work well. The main gaps:

| Gap | Why It Matters |
|-----|---------------|
| Zero test files (`.spec.ts`) | No safety net for regressions |
| No CI pipeline | Vercel deploys from `main` with no checks |
| Missing error recovery | Errors are shown to the user but state isn't rolled back |
| Two oversized components (500+ lines each) | Hard to maintain and review |
| No Supabase type generation | Unsafe `as` casts everywhere — schema drift won't be caught |

---

## Docs Index

Read in any order. Each doc is self-contained and includes code examples, effort estimates, and before/after comparisons.

| # | Doc | What's Inside | Priority |
|---|-----|--------------|----------|
| 1 | [Claude Instructions & CLAUDE.md](./01-claude-instructions.md) | How to restructure CLAUDE.md so it works better as an AI instruction file. Quick reference, anti-patterns, templates, shared UI guide. | High |
| 2 | [Code Quality & Architecture](./02-code-quality.md) | Supabase type generation, dead code removal, UID fix, barrel exports. | High |
| 3 | [Service Layer & Error Handling](./03-service-layer.md) | Error recovery with rollback, transaction safety, typed error results, loading/saving states. | High |
| 4 | [Component Refactoring](./04-component-refactoring.md) | How to break up WorkoutDashboard and PlanningForm, plus consistency fixes. | Medium |
| 5 | [Database, RLS & Migrations](./05-database.md) | Performance indexes, role self-update restriction, soft deletes, Expand/Contract completion. | High |
| 6 | [Testing Strategy](./06-testing.md) | Framework setup, tiered test targets, RLS test templates. | Critical |
| 7 | [Workflow, Security & Deployment](./07-workflow-security-deploy.md) | Git conventions, PR checklist, CI pipeline, CSP headers, SVG sanitization, production deploy checklist. | High |

---

## Priority At a Glance

### Before production deploy (do now)

| # | What | Doc | Effort |
|---|------|-----|--------|
| 1 | Add database performance indexes | [Database](./05-database.md#1-add-database-indexes) | 30 min |
| 2 | Add duplicate email check to invite function | [Workflow](./07-workflow-security-deploy.md#51-add-duplicate-email-check) | 20 min |
| 3 | Add loading states to prevent double-submit | [Services](./03-service-layer.md#4-add-loading-states-to-all-mutations) | 30 min |
| 4 | Add CLAUDE.md quick reference + anti-patterns | [Claude](./01-claude-instructions.md) | 25 min |

### Next 2 weeks

| # | What | Doc | Effort |
|---|------|-----|--------|
| 5 | Generate Supabase types | [Code Quality](./02-code-quality.md#1-add-supabase-type-generation) | 30 min |
| 6 | Add error recovery with state rollback | [Services](./03-service-layer.md#1-add-error-recovery-with-state-rollback) | 1 hour |
| 7 | Set up testing framework + Tier 1 tests | [Testing](./06-testing.md) | 6 hours |
| 8 | Add GitHub Actions CI | [Workflow](./07-workflow-security-deploy.md#1-github-actions-ci) | 1 hour |
| 9 | Decompose WorkoutDashboardComponent | [Components](./04-component-refactoring.md#1-decompose-workoutdashboardcomponent) | 2 hours |

### Next month

| # | What | Doc | Effort |
|---|------|-----|--------|
| 10 | Complete Expand/Contract cycle | [Database](./05-database.md#4-complete-the-expandcontract-cycle) | 1 hour |
| 11 | Add CSP headers | [Workflow](./07-workflow-security-deploy.md#41-content-security-policy-headers) | 20 min |
| 12 | Decompose PlanningFormComponent | [Components](./04-component-refactoring.md#2-decompose-planningformcomponent) | 1.5 hours |
| 13 | Transaction safety for multi-step mutations | [Services](./03-service-layer.md#2-add-transaction-safety-for-multi-step-mutations) | 2 hours |
| 14 | Write Tier 2 tests | [Testing](./06-testing.md#22-tier-2--should-have) | 4 hours |

---

## Key Files Referenced Throughout

| File | What It Is |
|------|-----------|
| `CLAUDE.md` | AI instruction file (primary improvement target) |
| `clauderc.json` | Claude Code config |
| `src/core/auth/auth.service.ts` | Auth state management |
| `src/core/planning/planning.service.ts` | Planning CRUD + tenant scoping |
| `src/core/workout/workout.service.ts` | Workout logging + Epley formula |
| `src/features/client/workout-dashboard/workout-dashboard.component.ts` | Main workout UI (needs decomposition) |
| `src/features/trainer/planning/planning-form/planning-form.component.ts` | Planning editor (needs decomposition) |
| `src/app/app.routes.ts` | Route definitions + guards |
| `supabase/functions/invite-client/index.ts` | Invite edge function |
| `supabase/migrations/` | 13 migration files |
