
# plan.md: Phased Implementation Roadmap

Execute development of the application linearly according to the following isolated sprints. Do not move onto a subsequent stage until all code implementations in the prior step are fully verified, operational, and free of architectural regressions.

---

## Phase 1: Local Infrastructure Setup & DB Bootstrapping
*This phase creates a fully self-contained local development environment mirroring the target serverless setup.*

### Tasks
1. **Docker Integration:** Author a `docker-compose.yml` defining an isolated PostgreSQL database instance configured for local execution.
2. **Database Scaffolding:** Execute the baseline DDL schema detailed in `claude.md`.
3. **Seeding Utility:** Create a local seed script introducing:
   - System standard global exercises.
   - 3 Test Roles: `trainer@test.local`, `user@test.local`, `free@test.local`.
4. **Angular Framework Initiation:** Initialize a pristine standalone Angular TypeScript shell with Tailwind CSS and Spartan UI dependencies installed.

### Autonomous Checklist for Claude
- Run local database containers seamlessly.
- Initialize database structural migrations.
- Verify basic framework boilerplate compilation with zero linting or type configuration failures.

---

## Phase 2: Core Authentication, Tenancy & Dynamic Theming Engine
*Establishes the foundation of role enforcement and client dynamic branding rules.*

### Tasks
1. **Supabase Client Core Integration:** Implement the client token handlers inside an Angular Service layer utilizing Angular Signals to track the active authenticated profile.
2. **The Reactive Theme Engine Service:** Build out the absolute pure mathematical utility tracking Hex to HSL conversions. Write the DOM injector binding variables directly onto the application layout frame as native CSS custom properties.
3. **Guarded Route Routing Infrastructure:** Construct strict functional structural Route Guards checking explicit profile access rights (`trainer`, `user`, `free`).
4. **Multi-Tenant Global Configuration Module:** Architect an isolated branding component framework displaying inline SVGs safely using explicit Angular layout sanitization hooks (`DomSanitizer`).

### Autonomous Checklist for Claude
- Complete login, account creation, and role determination state routines.
- Verify instant page layout adjustments (buttons, ambient focus shadows, and color-inverted textual contrasts) when changing a tenant's primary hex code configuration.

---

## Phase 3: Mobile Client Workspace (Home Tracking Flow)
*Focuses purely on building out the high-density workout engine for mobile layouts.*

### Tasks
1. **The Dynamic Workout Table Interface:** Construct a mobile view looping over structural prescription records.
   - **Exigence Badges:** Assign strict visual mappings ($A$ = Rich Red, $D$ = Light Ice Blue).
   - **Weight Recommendation Engine:** Integrate the structural Epley mathematical transformation rules ($1\text{RM}$) directly into state placeholder properties.
2. **Adaptive Tracking Inputs Template Integration:** Map input presentation fields adaptively based on contextual configurations:
   - `standard`: A singular collective entry form input.
   - `granular`/`failure`: An array-mapped sequence of entry forms generated according to explicit set repetitions.
3. **Inline Mutation Persistency Loop:** Design state handlers marking single rows as resolved (`is_completed = true`) on input changes.
4. **Workout Finalization Workflow Engine:** Build a Spartan UI context drawer or dialog appearing when clicking the global "Complete Workout" button. Collect subjective scores from 1 to 5, write the complete dataset transaction to Supabase, and automatically increment the active tracking configuration state to the next consecutive relative day.

### Autonomous Checklist for Claude
- Complete end-to-end execution testing of local gym plans via a simulated mobile interface shell.
- Confirm automated placeholder calculations match expectations when modifying rep ranges.
- Validate transaction handling when submitting missing field inputs (ensuring they auto-complete using suggested placeholders).

---

## Phase 4: Desktop Administrative Workspace (Trainer Custom Dashboard)
*Implements the complex structural planning tools designed for desktop workflows.*

### Tasks
1. **Exercise Management Core Portal:** Build data input interfaces supporting comprehensive CRUD workflows on exercises.
2. **Interactive Muscle Tagging Matrix Component:** Implement a drag-and-drop structural array management UI using Angular CDK Drag & Drop. Allow trainers to reorder targeted muscles, instantly mapping array index allocations to explicit tracking attributes (`primary`, `secondary`, `tertiary`).
3. **The Matrix Training Planner Form Engine:** Construct the relative planning grid (Day 1 through Day 7 mapping). Provide user assignment selectors targeting explicit clients locked inside the administrative trainer's specific multi-tenant ID perimeter.

### Autonomous Checklist for Claude
- Test drag-and-drop mechanics to confirm muscle priority array items adjust index orders smoothly.
- Validate form constraints ensuring trainers cannot assign conflicting duplicate operations across the same training days.
- Ensure cross-tenant data isolation holds true so distinct managers cannot see or modify outer tenant definitions.