-- Speed up exercise history lookups from workout_sessions.exercises JSONB.
-- This supports cross-device history retrieval without introducing duplicate tables.

CREATE INDEX IF NOT EXISTS idx_workout_sessions_exercises_gin
ON workout_sessions
USING GIN (exercises jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_by_user
ON workout_sessions (user_id, completed_at DESC)
WHERE status = 'completed' OR completed_at IS NOT NULL;
