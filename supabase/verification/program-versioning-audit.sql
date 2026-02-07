-- Program versioning audit
-- Run in Supabase SQL editor to validate backfill/link integrity.

-- 1) Programs missing a current version pointer (should be 0)
SELECT COUNT(*) AS programs_missing_current_version
FROM programs
WHERE current_version_id IS NULL;

-- 2) Programs with no version rows (should be 0)
SELECT COUNT(*) AS programs_without_versions
FROM programs p
WHERE NOT EXISTS (
	SELECT 1
	FROM program_versions pv
	WHERE pv.program_id = p.id
);

-- 3) Sessions missing program_version_id (should trend to 0)
SELECT COUNT(*) AS sessions_missing_program_version
FROM workout_sessions
WHERE program_version_id IS NULL;

-- 4) Sessions missing workout_version_id (should trend to 0)
SELECT COUNT(*) AS sessions_missing_workout_version
FROM workout_sessions
WHERE workout_version_id IS NULL;

-- 5) Detailed unresolved session mappings (inspect manually)
SELECT
	ws.id,
	ws.program_id,
	ws.program_version_id,
	ws.workout_id,
	ws.workout_name_snapshot,
	ws.status,
	ws.started_at,
	ws.completed_at
FROM workout_sessions ws
WHERE ws.program_version_id IS NULL
	OR ws.workout_version_id IS NULL
ORDER BY ws.started_at DESC
LIMIT 200;

-- 6) Version growth sanity check per program
SELECT
	p.id AS program_id,
	p.name,
	p.current_version_id,
	COUNT(pv.id) AS version_count,
	MAX(pv.version_number) AS latest_version_number
FROM programs p
LEFT JOIN program_versions pv ON pv.program_id = p.id
GROUP BY p.id, p.name, p.current_version_id
ORDER BY p.created_at DESC;
