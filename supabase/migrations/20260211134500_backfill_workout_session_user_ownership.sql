-- Repair migration: backfill workout_sessions.user_id for legacy rows.
-- Why:
-- - RLS policies on workout_sessions depend on user_id ownership.
-- - Older rows with NULL user_id become invisible (not deleted) to the app.
-- Strategy:
-- - Safely infer ownership from the linked program where possible.
-- - Do not overwrite existing non-null session ownership.

UPDATE workout_sessions ws
SET user_id = p.user_id
FROM programs p
WHERE ws.program_id = p.id
  AND ws.user_id IS NULL
  AND p.user_id IS NOT NULL;

-- Optional diagnostic (run manually in SQL editor if needed):
-- SELECT
--   COUNT(*) AS total_sessions,
--   COUNT(*) FILTER (WHERE user_id IS NULL) AS sessions_missing_user_id
-- FROM workout_sessions;
