# 4. Component Refactoring

[Back to index](./IMPROVEMENTS.md)

---

## What's Good Already

- All components are standalone with `OnPush` change detection
- Signal-based state throughout (no `effect()` abuse)
- Consistent patterns: `inject()` for DI, `signal()` for state, `computed()` for derived values
- Good shared UI library (`IconButton`, `EmptyState`, `Skeleton`, `Toggle`, `PageHeader`, `Sheet`)

This doc addresses two oversized components and a few consistency fixes.

---

## 1. Decompose WorkoutDashboardComponent

**Effort: 2 hours | Impact: High**

### The Problem

`src/features/client/workout-dashboard/workout-dashboard.component.ts` is ~500 lines and handles:

- Plan loading and active day resolution
- Per-exercise input tracking (weight, reps) for both standard and granular modes
- Exercise completion toggling
- Session finalization with subjective score
- Timer integration
- "Connect to plan via UUID" flow

That's 6 concerns in one file. It's hard to review diffs and harder to test.

### Proposed Extraction

| New Component | What It Does | Approx Lines |
|---------------|-------------|-------------|
| `ExerciseCardComponent` | Renders one exercise: name, exigence badge, rounds, weight/reps inputs, timer button, completion toggle | ~120 |
| `RoundInputComponent` | One weight + reps input pair for a single round | ~40 |
| `SessionDrawerComponent` | The "Finish Workout" bottom sheet with star rating and confirm button | ~60 |
| `ConnectPlanCardComponent` | The "Have a plan ID?" card with UUID input and Connect button | ~40 |

After extraction, `WorkoutDashboardComponent` becomes ~250 lines focused on:
- Loading the plan and resolving the active day
- Coordinating state between child components
- Calling `WorkoutService.saveSession()` on finalization

### Communication Pattern

Use Angular's signal-based `input()` / `output()` for parent-child communication:

```typescript
// ExerciseCardComponent
readonly exercise = input.required<PrescribedExercise>();
readonly inputs = input.required<RoundInput[]>();
readonly completed = input.required<boolean>();
readonly inputChanged = output<{ roundIndex: number; field: 'weight' | 'reps'; value: number | null }>();
readonly completionToggled = output<void>();
```

The parent owns the state; children emit events. No two-way binding, no shared mutable state.

---

## 2. Decompose PlanningFormComponent

**Effort: 1.5 hours | Impact: Medium**

### The Problem

`src/features/trainer/planning/planning-form/planning-form.component.ts` is ~500 lines handling:

- Plan metadata (title, auto-1RM toggle)
- Day accordion (7 days, each with a list of exercises)
- CDK drag-and-drop for exercise reordering
- Exercise row editing (exercise selection, exigence, rest time, tracking mode, rounds, reps, weight)
- User assignment panel (checkboxes to assign the plan to clients)
- Read-only mode (when viewing a friend's shared plan)

### Proposed Extraction

| New Component | What It Does |
|---------------|-------------|
| `PlanningDayAccordionComponent` | One day's header + expandable exercise list + CDK drag-drop zone |
| `PrescribedExerciseRowComponent` | One exercise row: select, exigence, rest time, mode, rounds, reps, weight |
| `PlanningAssignmentPanelComponent` | The user checkboxes section (trainer-only) |

After extraction, `PlanningFormComponent` is ~200 lines: metadata form, loading, save logic, and a `@for` loop over `DayAccordion` children.

---

## 3. Use HlmSheetComponent Consistently

**Effort: 15 min | Impact: Low**

### The Problem

`WorkoutDashboardComponent` manually implements a bottom drawer:

```html
<!-- Current: manual overlay + panel -->
@if (finishDrawerOpen()) {
  <div class="fixed inset-0 z-50 bg-black/60" (click)="closeFinish()"></div>
  <div class="fixed inset-x-0 bottom-0 z-50 bg-neutral-900 ...">
    <!-- drawer content -->
  </div>
}
```

But the project already has a reusable `HlmSheetComponent` in `src/shared/ui/sheet/` that does exactly this — with backdrop click-to-close, configurable side (right or bottom), title slot, and consistent styling.

### The Fix

```html
<hlm-sheet [open]="finishDrawerOpen()" side="bottom" (closed)="closeFinish()">
  <!-- same drawer content, just moved inside the sheet -->
</hlm-sheet>
```

This removes ~15 lines of manual overlay code and ensures the drawer looks consistent with sheets used elsewhere (like the exercise edit sheet).

---

## 4. Add Pre-Submit Validation to PlanningFormComponent

**Effort: 20 min | Impact: Medium**

### The Problem

The exercise `<select>` defaults to an empty option (`value=""`). A user can click Save with exercises that have no `exercise_id` selected. The form submits successfully, creating a prescribed exercise row pointing to no exercise.

### The Fix

Add validation at the top of `submit()`:

```typescript
async submit(): Promise<void> {
  const days = this.days();

  // Check for unselected exercises
  const hasEmptyExercise = days.some(d =>
    d.exercises.some(ex => !ex.exercise_id)
  );
  if (hasEmptyExercise) {
    this.error.set('planning.error.missing_exercise');
    return;
  }

  // Check for at least one exercise in the plan
  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);
  if (totalExercises === 0) {
    this.error.set('planning.error.no_exercises');
    return;
  }

  // ... rest of existing submit logic
}
```

Add the two new translation keys to `i18n.dictionary.ts` (both EN and ES).
