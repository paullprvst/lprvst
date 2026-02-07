# Reliability Migration Plan

## Goal
Move from mutable program JSON blobs to a stable, versioned model without losing workout history or the current active program.

## Guardrails
- Never delete or overwrite historical workout session data.
- Every migration step must be reversible.
- Keep app usable throughout migration via dual-write / compatibility reads.

## Phase 1 (Implemented)
- Preserve stable workout/exercise IDs when AI modifies programs.
- Add program invariant checks before persistence (schedule/index/id/set/rest validation).
- Add `workout_name_snapshot` to workout sessions for history resilience.
- Repair weekly schedule indexes when deleting workouts from the program editor.

## Phase 2 (Next)
- Introduce immutable program versioning tables:
  - `program_versions`
  - `program_version_workouts`
  - `program_version_exercises`
  - `program_version_schedule`
- Add `program_version_id` and `workout_version_id` references to `workout_sessions`.
- Keep existing JSON columns during transition.

Status:
- Implemented in migration `20260207113000_add_program_versioning.sql`.
- Includes backfill from existing JSON programs/sessions.
- Includes automatic trigger-based version creation on `programs` insert/update.
- Includes automatic pointer sync for `workout_sessions` version links.
- Legacy repair patch added in `20260207133000_repair_workout_version_links.sql` for unresolved historical `workout_version_id` links.
- Follow-up repair in `20260207140000_fix_legacy_workout_mapping.sql` selects best unambiguous slug match for legacy workout IDs.
- Deterministic repair in `20260207143000_resolve_workout_links_by_exercises.sql` matches unresolved sessions by exercise-name overlap, with schedule fallback.

## Phase 3
- Backfill existing programs into version `v1`.
- Backfill sessions to matching version/workout/exercise rows.
- Generate a migration report for unmatched records (no silent drops).

## Phase 4
- Switch reads (calendar, workout execution, history) to versioned tables.
- Keep legacy JSON writes for a short transition window.
- Add consistency checks comparing legacy vs. versioned reads.

## Phase 5
- Remove legacy JSON as source of truth.
- Keep legacy columns read-only for rollback window.
- Finalize by removing dead compatibility code.

## Rollback Strategy
- Keep all pre-migration data and schema objects until a full release cycle passes.
- Run rollout behind a feature flag:
  - `PROGRAM_VERSIONING_READS`
  - `PROGRAM_VERSIONING_WRITES`
- If issues occur, disable read flag first, then write flag.

## Acceptance Criteria
- Existing history remains visible with correct workout names.
- Last performance lookups continue to work across program edits.
- No broken schedule references after workout deletion.
- AI modifications no longer break IDs for unchanged workouts/exercises.
