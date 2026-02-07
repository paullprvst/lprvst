-- Deterministic repair for unresolved workout_sessions.workout_version_id.
-- Strategy:
-- 1) Match unresolved sessions to workout versions in the same program_version
--    by maximum overlap of normalized exercise names.
-- 2) If still unresolved, fall back to schedule day-of-week mapping.
-- 3) Backfill workout_name_snapshot from matched workout version.

-- ===========================================
-- Pass 1: Exercise-overlap matching
-- ===========================================

WITH unresolved AS (
	SELECT
		ws.id AS session_id,
		ws.program_version_id,
		ws.exercises,
		ws.started_at,
		ws.completed_at
	FROM workout_sessions ws
	WHERE ws.workout_version_id IS NULL
		AND ws.program_version_id IS NOT NULL
),
session_exercise_names AS (
	SELECT
		u.session_id,
		LOWER(TRIM(e.value->>'exerciseName')) AS exercise_name
	FROM unresolved u
	CROSS JOIN LATERAL jsonb_array_elements(COALESCE(u.exercises, '[]'::jsonb)) AS e(value)
	WHERE COALESCE(TRIM(e.value->>'exerciseName'), '') <> ''
),
workout_exercise_names AS (
	SELECT
		pvw.id AS workout_version_id,
		pvw.program_version_id,
		pvw.position,
		LOWER(TRIM(pve.name)) AS exercise_name
	FROM program_version_workouts pvw
	JOIN program_version_exercises pve ON pve.workout_version_id = pvw.id
	WHERE COALESCE(TRIM(pve.name), '') <> ''
),
overlap_scores AS (
	SELECT
		u.session_id,
		pvw.id AS workout_version_id,
		pvw.position,
		COUNT(DISTINCT sen.exercise_name) FILTER (WHERE wen.exercise_name IS NOT NULL) AS overlap_count
	FROM unresolved u
	JOIN program_version_workouts pvw
		ON pvw.program_version_id = u.program_version_id
	LEFT JOIN session_exercise_names sen
		ON sen.session_id = u.session_id
	LEFT JOIN workout_exercise_names wen
		ON wen.workout_version_id = pvw.id
		AND wen.exercise_name = sen.exercise_name
	GROUP BY u.session_id, pvw.id, pvw.position
),
ranked AS (
	SELECT
		os.*,
		ROW_NUMBER() OVER (
			PARTITION BY os.session_id
			ORDER BY os.overlap_count DESC, os.position ASC
		) AS rn,
		LEAD(os.overlap_count) OVER (
			PARTITION BY os.session_id
			ORDER BY os.overlap_count DESC, os.position ASC
		) AS next_overlap
	FROM overlap_scores os
)
UPDATE workout_sessions ws
SET workout_version_id = r.workout_version_id
FROM ranked r
WHERE ws.id = r.session_id
	AND ws.workout_version_id IS NULL
	AND r.rn = 1
	AND r.overlap_count > 0
	AND (r.next_overlap IS NULL OR r.overlap_count > r.next_overlap);

-- ===========================================
-- Pass 2: Schedule day-of-week fallback
-- ===========================================

WITH unresolved AS (
	SELECT
		ws.id AS session_id,
		ws.program_version_id,
		COALESCE(ws.completed_at, ws.started_at) AS session_time
	FROM workout_sessions ws
	WHERE ws.workout_version_id IS NULL
		AND ws.program_version_id IS NOT NULL
),
schedule_candidates AS (
	SELECT
		u.session_id,
		pvs.workout_version_id,
		ROW_NUMBER() OVER (
			PARTITION BY u.session_id
			ORDER BY pvs.id
		) AS rn,
		COUNT(*) OVER (
			PARTITION BY u.session_id
		) AS candidate_count
	FROM unresolved u
	JOIN program_version_schedule pvs
		ON pvs.program_version_id = u.program_version_id
		AND pvs.workout_version_id IS NOT NULL
		AND pvs.day_of_week = ((EXTRACT(DOW FROM u.session_time)::int + 6) % 7)
)
UPDATE workout_sessions ws
SET workout_version_id = sc.workout_version_id
FROM schedule_candidates sc
WHERE ws.id = sc.session_id
	AND ws.workout_version_id IS NULL
	AND sc.rn = 1
	AND sc.candidate_count = 1;

-- ===========================================
-- Snapshot backfill after linking
-- ===========================================

UPDATE workout_sessions ws
SET workout_name_snapshot = pvw.name
FROM program_version_workouts pvw
WHERE ws.workout_version_id = pvw.id
	AND ws.workout_name_snapshot IS NULL;
