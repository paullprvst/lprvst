# UI Level-Up Task Board

## Goal
Ship a spotless, production-grade UI with zero visual regressions across desktop and mobile.

## Product Constraint
- Dark mode only. No light mode and no system theme mode.

## Quality Gates (Definition of Done)
- No horizontal overflow from 320px to 1536px.
- Touch targets are at least 44x44 where interactive.
- Color contrast meets WCAG AA for body text and controls.
- Keyboard navigation works on all actionable controls.
- No native `alert()` / `confirm()` UX in core flows.
- No undefined/unused semantic utility classes.
- Visual regression snapshots pass for core user journeys (mobile + desktop) in dark mode.

## Execution Order
1. Foundation and tokens
2. Shared components hardening
3. Screen-by-screen polish passes
4. Mobile behavior pass
5. QA, accessibility, and visual regression

## Current Status (Updated: 2026-02-07)
- DONE: UI-000, UI-001, UI-002, UI-003, UI-010, UI-011, UI-020, UI-021, UI-022, UI-023, UI-024, UI-025, UI-026, UI-027
- IN PROGRESS: UI-031
- PENDING: UI-030, UI-032
- Build blocker: `npm run build` still fails in PWA service worker generation (Workbox/Terser `renderChunk` early exit). UI refactor compiles and `npm run check` is clean.

## Phase 0: Foundation

### UI-000 (P0) Dark-only theme enforcement
- Status: DONE
- Scope: Remove multi-theme behavior from app runtime and settings
- Files:
  - `src/lib/stores/theme-store.svelte.ts`
  - `src/app.css`
  - `src/app.html`
  - `src/routes/settings/+page.svelte`
  - `src/lib/types/user.ts`
- Tasks:
  - Make dark theme the only supported theme value in runtime and persistence.
  - Remove theme switcher UI from settings.
  - Move dark token values to default `:root` and remove light-mode token branch.
  - Ensure initial theme boot script always applies dark mode and dark `theme-color`.
  - Clean up user preference typing for removed `light`/`system` options.
- Acceptance:
  - App always renders in dark mode.
  - No theme-toggle controls remain.
  - No light/system code paths remain in client theme handling.

### UI-001 (P0) Token and semantic color unification
- Status: DONE
- Scope: Global styling system
- Files:
  - `src/app.css`
  - `tailwind.config.js`
  - `src/lib/components/visualization/MuscleHeatmap.svelte`
  - `src/lib/components/visualization/MuscleTooltip.svelte`
- Tasks:
  - Replace ad hoc named colors (cyan/green/orange/gray utility mixes) with tokenized usage rules.
  - Remove/replace undefined semantic classes (`text-foreground`, `bg-primary/90`, etc.) with valid token-backed classes.
  - Define a documented semantic palette map for success/warning/error/info accents.
- Acceptance:
  - No unresolved semantic class names.
  - Core visual states are consistent across the single dark theme.

### UI-002 (P0) Layout shell and navigation consistency
- Status: DONE
- Scope: App frame, safe areas, responsive spacing
- Files:
  - `src/routes/+layout.svelte`
  - `src/app.css`
- Tasks:
  - Standardize page container widths, vertical rhythm, and bottom-nav spacing for all routes.
  - Add explicit active state rules and label accessibility for bottom navigation.
  - Verify safe-area behavior on iOS notches/home indicator.
- Acceptance:
  - No clipped content behind nav.
  - Stable spacing across all route transitions.

### UI-003 (P0) Replace native modal/browser prompts
- Status: DONE
- Scope: Confirmation and error UX
- Files:
  - `src/routes/calendar/+page.svelte`
  - `src/routes/programs/[id]/+page.svelte`
  - `src/routes/onboarding/+page.svelte`
  - `src/routes/programs/[id]/adapt/+page.svelte`
  - `src/routes/workout/[id]/+page.svelte`
  - `src/lib/components/shared/Modal.svelte`
- Tasks:
  - Replace `alert()`/`confirm()` flows with in-app modal/dialog pattern.
  - Add consistent inline/toast error messaging.
- Acceptance:
  - No native browser dialogs in primary UX flows.

## Phase 1: Shared Primitives

### UI-010 (P0) Shared form control system
- Status: DONE
- Scope: Inputs, selects, textareas, button states
- Files:
  - `src/lib/components/shared/Input.svelte`
  - `src/lib/components/shared/Button.svelte`
  - `src/routes/login/+page.svelte`
  - `src/routes/signup/+page.svelte`
  - `src/routes/calendar/+page.svelte`
  - `src/lib/components/body/WeightEntryForm.svelte`
  - `src/lib/components/workout/ExerciseDisplay.svelte`
  - `src/routes/history/[id]/+page.svelte`
- Tasks:
  - Remove direct one-off input/button styles in routes and replace with shared primitives.
  - Add select variant support and numeric input variant in shared components.
  - Normalize focus, error, disabled, loading, and density behavior.
- Acceptance:
  - Auth/forms have no custom one-off control styling.
  - Inputs/buttons behave consistently across all pages.

### UI-011 (P1) Card and section composition standards
- Status: DONE (2026-02-07)
- Scope: Card hierarchy, spacing, empty states
- Files:
  - `src/lib/components/shared/Card.svelte`
  - `src/routes/body/+page.svelte`
  - `src/routes/history/+page.svelte`
  - `src/routes/programs/+page.svelte`
  - `src/routes/settings/+page.svelte`
- Tasks:
  - Define and apply card variants for info, warning, success, and interactive states.
  - Normalize heading scales and section spacing between screens.
- Acceptance:
  - Consistent card rhythm and information hierarchy in all route screens.

## Phase 2: Screen Polish Passes

### UI-020 (P0) Auth screens polish
- Status: DONE
- Scope: Login and signup
- Files:
  - `src/routes/login/+page.svelte`
  - `src/routes/signup/+page.svelte`
- Tasks:
  - Align auth layout spacing and typography with shared design system.
  - Improve form feedback states and error message presentation.
  - Validate small-screen keyboard behavior and viewport resizing.
- Acceptance:
  - Auth flows look and behave identically to system standards on mobile/desktop.

### UI-021 (P0) Program list and program detail polish
- Status: DONE
- Scope: Program browsing and detail management
- Files:
  - `src/lib/components/program/ProgramList.svelte`
  - `src/lib/components/program/ProgramCard.svelte`
  - `src/routes/programs/+page.svelte`
  - `src/routes/programs/[id]/+page.svelte`
- Tasks:
  - Tighten hierarchy in headers/actions.
  - Improve badge, schedule, and empty-state visual consistency.
  - Ensure modal sticky action bar does not obscure content on mobile.
- Acceptance:
  - Program browsing/editing reads cleanly and scales cleanly across breakpoints.

### UI-022 (P0) Calendar experience polish
- Status: DONE
- Scope: Week view, day cards, in-progress workout banner
- Files:
  - `src/routes/calendar/+page.svelte`
  - `src/lib/components/calendar/WeekView.svelte`
  - `src/lib/components/calendar/CalendarDay.svelte`
- Tasks:
  - Standardize calendar cell sizing and contrast for today/completed/future states.
  - Improve selector and action row ergonomics on small screens.
  - Ensure animation density does not create visual noise.
- Acceptance:
  - Calendar is readable and tappable at 320px and desktop widths.

### UI-023 (P0) Workout execution screen polish
- Status: DONE
- Scope: Active workout flow
- Files:
  - `src/routes/workout/[id]/+page.svelte`
  - `src/lib/components/workout/ExerciseDisplay.svelte`
  - `src/lib/components/workout/ExerciseTimer.svelte`
  - `src/lib/components/workout/RestTimer.svelte`
  - `src/lib/components/workout/SetInputModal.svelte`
- Tasks:
  - Normalize set entry controls and CTA prominence.
  - Improve readability of progress/session-plan stack on mobile.
  - Ensure leave/resume/abandon decision UX is clear and safe.
- Acceptance:
  - In-workout flow is one-handed usable on mobile and visually stable on desktop.

### UI-024 (P1) History and details polish
- Status: DONE
- Scope: History list and session detail editing
- Files:
  - `src/routes/history/+page.svelte`
  - `src/routes/history/[id]/+page.svelte`
  - `src/lib/components/history/WorkoutCalendarDots.svelte`
- Tasks:
  - Tighten list density, metadata layout, and detail edit controls.
  - Improve mobile stacking for date/time/sets metadata.
- Acceptance:
  - History scanning and detail edits feel clean and low-friction.

### UI-025 (P1) Body tracking polish
- Status: DONE
- Scope: Weight logging, chart, entries
- Files:
  - `src/routes/body/+page.svelte`
  - `src/lib/components/body/WeightChart.svelte`
  - `src/lib/components/body/WeightEntryForm.svelte`
  - `src/lib/components/body/WeightEntryList.svelte`
- Tasks:
  - Tokenize chart colors to match theme variables.
  - Unify form controls with shared input system.
  - Improve stats-card legibility and reduce color inconsistency (e.g., purple/orange drift).
- Acceptance:
  - Body page appears cohesive with the rest of the product in both themes.

### UI-026 (P1) Onboarding and AI chat polish
- Status: DONE
- Scope: Goal input and conversational UX
- Files:
  - `src/routes/onboarding/+page.svelte`
  - `src/routes/programs/[id]/adapt/+page.svelte`
  - `src/lib/components/onboarding/ObjectiveInput.svelte`
  - `src/lib/components/onboarding/AIConversation.svelte`
- Tasks:
  - Improve message container sizing, input ergonomics, and loading states on mobile.
  - Standardize empty/error states with app-wide pattern.
- Acceptance:
  - Chat feels consistent with the product shell and remains usable on small screens.

### UI-027 (P1) Settings page polish
- Status: DONE
- Scope: Account, API key, theme blocks
- Files:
  - `src/routes/settings/+page.svelte`
- Tasks:
  - Normalize icon color usage and card hierarchy.
  - Refine visual density and action grouping.
- Acceptance:
  - Settings page has clear information architecture and clean state transitions.

## Phase 3: Responsive and QA

### UI-030 (P0) Breakpoint-specific QA checklist
- Status: PENDING
- Scope: All core routes
- Files:
  - `src/routes/+layout.svelte`
  - `src/routes/calendar/+page.svelte`
  - `src/routes/programs/[id]/+page.svelte`
  - `src/routes/workout/[id]/+page.svelte`
  - `src/routes/history/[id]/+page.svelte`
- Tasks:
  - Validate at 320, 375, 430, 768, 1024, 1280, and 1536 widths.
  - Fix all overflow, wrapping, clipping, and sticky/footer collisions.
- Acceptance:
  - Zero layout breakpoints with overlap or clipping.

### UI-031 (P0) Accessibility compliance pass
- Status: IN PROGRESS (automated warnings fixed; manual end-to-end keyboard and screen-reader checks still pending)
- Scope: Keyboard, focus, semantics, labels
- Files:
  - `src/routes/**/*.svelte`
  - `src/lib/components/**/*.svelte`
- Tasks:
  - Add missing labels for icon-only buttons and control groups.
  - Ensure tab order and focus-visible behavior are coherent.
  - Validate form errors are announced and visually obvious.
- Acceptance:
  - Keyboard-only journey works for auth, onboarding, workout, and settings.

### UI-032 (P1) Visual regression harness
- Status: PENDING
- Scope: Pixel stability for critical flows
- Files:
  - `package.json`
  - `tests/` (new)
- Tasks:
  - Add snapshot tests for core screens in dark mode for mobile/desktop.
  - Gate merges on visual diff approval for critical screens.
- Acceptance:
  - UI regressions are detected automatically before release.

## Suggested Sprint Breakdown
- Sprint 1: UI-000, UI-001, UI-002, UI-003, UI-010
- Sprint 2: UI-020, UI-021, UI-022, UI-023
- Sprint 3: UI-024, UI-025, UI-026, UI-027
- Sprint 4: UI-030, UI-031, UI-032 + final pixel pass
