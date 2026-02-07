ALTER TABLE workout_sessions
ADD COLUMN IF NOT EXISTS workout_name_snapshot TEXT;

-- Backfill from current program JSON where possible
UPDATE workout_sessions ws
SET workout_name_snapshot = workout_json.value->>'name'
FROM programs p,
LATERAL jsonb_array_elements(p.workouts) AS workout_json(value)
WHERE ws.program_id = p.id
  AND ws.workout_name_snapshot IS NULL
  AND workout_json.value->>'id' = ws.workout_id;
