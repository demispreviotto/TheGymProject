# Gym Planificación

A multi-tenant gym management web application. Trainers manage client rosters, build training plans, and invite clients. Clients track their daily workouts on mobile. Free users can create their own plans and share them with friends.

---

## What it does

| Role | Capabilities |
|------|-------------|
| **Trainer** | Manage exercises and training plans, invite clients, view client roster, assign plans per client |
| **Client (user)** | Mobile workout dashboard — log sets, weights, and reps; adaptive weight suggestions via Epley 1RM |
| **Free user** | Self-service exercise and plan creation, friend connections, plan sharing |
| **Admin** | Invite any user role, manage all accounts, review and approve free-user invite requests |

**Key features**
- Dynamic gym branding (logo, primary colour) applied at runtime per trainer tenant
- EN / ES localisation throughout
- Invite-link flow — no email quota concerns; shareable via the OS native share sheet (WhatsApp, iMessage, etc.)
- Protocol sharing — trainers can share a plan ID that clients paste to self-enrol
- Password reset portal via Supabase magic-link recovery

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19 (standalone components, signals) |
| UI | Tailwind CSS + Spartan UI (Radix primitives) |
| Build | Angular Application Builder (esbuild / Vite dev server) |
| Backend | Supabase — PostgreSQL + Row-Level Security + Auth |
| Edge Functions | Deno (Supabase Edge Runtime) |
| Hosting | Vercel |
| Package manager | pnpm 11 |

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 24.x | https://nodejs.org |
| pnpm | 11.x | `npm install -g pnpm` |
| Supabase CLI | latest | `pnpm add -g supabase` |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop — **must be running** for the local Supabase stack |

---

## Installation

```bash
# 1. Clone the repo
git clone <repo-url>
cd the-gym-project

# 2. Install dependencies
pnpm install
```

---

## Environment setup

Create a `.env.local` file at the project root (never committed — already in `.gitignore`):

```bash
cp .env.example .env.local
```

For **local development** the Angular app points to the local Supabase instance automatically — no extra vars needed in `.env.local` for the frontend.

For **production** (Vercel), set these in the Vercel project dashboard under *Settings → Environment Variables*:

```
NG_APP_SUPABASE_URL=https://<project-ref>.supabase.co
NG_APP_SUPABASE_ANON_KEY=<your-anon-key>
```

### Edge function env (local only)

The invite edge function needs to know the local app URL. This file is already created and gitignored:

```
supabase/functions/invite-client/.env
```

Contents:
```
SITE_URL=http://localhost:4200
```

In production, `SITE_URL` is set as a Supabase project secret via the dashboard (*Settings → Edge Functions → Secrets*).

---

## Running locally

The app requires **three concurrent processes**. Open separate terminals for each.

### Terminal 1 — Supabase local stack

Starts the local PostgreSQL database, Auth server, Storage, and Kong API gateway.
Requires Docker Desktop to be running.

```bash
pnpm supabase:start
```

First run will pull Docker images — this takes a few minutes.
Subsequent starts are fast.

Local service ports:

| Service | URL |
|---------|-----|
| Kong API (Supabase URL) | http://127.0.0.1:54321 |
| PostgreSQL | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Supabase Studio | http://127.0.0.1:54323 |
| Mailpit (email testing) | http://127.0.0.1:54324 |

To stop the stack:
```bash
pnpm supabase:stop
```

### Terminal 2 — Edge functions runtime

Serves the Deno edge functions locally (required for the invite flow).

```bash
pnpm exec supabase functions serve
```

This hot-reloads any function under `supabase/functions/` on file save.

### Terminal 3 — Angular dev server

```bash
pnpm start
```

App is available at **http://localhost:4200**

---

## Database

### Apply migrations (first time or after a reset)

```bash
pnpm exec supabase db reset
```

This drops and recreates the local database, runs all migrations in order, and loads `supabase/seed.sql`.

### Push migrations to production

```bash
pnpm exec supabase db push --project-ref <project-ref>
```

### Open Supabase Studio (local DB GUI)

```bash
pnpm supabase:studio
```

Or navigate directly to http://127.0.0.1:54323.

---

## Seed data

`supabase/seed.sql` creates test accounts for local development:

| Email | Password | Role |
|-------|----------|------|
| `trainer@test.local` | `password123` | trainer |
| `user@test.local` | `password123` | user (client) |
| `free@test.local` | `password123` | free |
| `admin@test.local` | `password123` | admin |

---

## Production deployment

The app deploys automatically to Vercel on every push to `main`.

To deploy edge functions to production:

```bash
pnpm exec supabase functions deploy invite-client --project-ref <project-ref>
```

---

## Project structure

```
src/
  app/                    # Angular root module, routes
  core/                   # Global singletons: auth, supabase client, services, i18n
  features/               # Page components grouped by role
    auth/                 # Login, Register, Reset password
    trainer/              # Exercises, Planning, Client roster
    client/               # Workout dashboard
    admin/                # Admin portal (users, invite requests)
    free/                 # Self-service planning, friends
    profile/              # Shared profile page
  shared/                 # Dumb UI primitives, pipes, icons
    ui/                   # Spartan UI wrappers, AppIconComponent
    pipes/                # TranslatePipe
    components/           # TenantBrandingComponent
supabase/
  migrations/             # PostgreSQL schema migrations (ordered)
  functions/              # Deno edge functions
    invite-client/        # Generates invite links for trainers and admins
  seed.sql                # Local dev seed data
```
.