-- Repair unresolved workout_version_id links for legacy sessions
-- and strengthen trigger fallback for slug-style workout IDs.

-- ===========================================
-- One-time backfill for unresolved sessions
-- ===========================================

WITH unresolved AS (
	SELECT
		ws.id AS session_id,
		ws.program_version_id,
		ws.workout_id,
		regexp_replace(
			lower(regexp_replace(ws.workout_id, '^workout-', '')),
			'[^a-z0-9]+',
			'-',
			'g'
		) AS workout_slug
	FROM workout_sessions ws
	WHERE ws.workout_version_id IS NULL
		AND ws.program_version_id IS NOT NULL
		AND ws.workout_id IS NOT NULL
),
candidates AS (
	SELECT
		u.session_id,
		pvw.id AS workout_version_id,
		pvw.position,
		regexp_replace(lower(pvw.name), '[^a-z0-9]+', '-', 'g') AS name_slug,
		u.workout_slug
	FROM unresolved u
	JOIN program_version_workouts pvw
		ON pvw.program_version_id = u.program_version_id
),
scored AS (
	SELECT
		c.*,
		CASE
			WHEN c.name_slug = c.workout_slug THEN 0
			WHEN c.name_slug LIKE c.workout_slug || '-%' THEN 1
			WHEN c.workout_slug LIKE c.name_slug || '-%' THEN 2
			WHEN c.name_slug LIKE '%' || c.workout_slug || '%' THEN 3
			WHEN c.workout_slug LIKE '%' || c.name_slug || '%' THEN 4
			ELSE 99
		END AS score
	FROM candidates c
),
ranked AS (
	SELECT
		s.*,
		ROW_NUMBER() OVER (
			PARTITION BY s.session_id
			ORDER BY
				s.score,
				ABS(LENGTH(s.name_slug) - LENGTH(s.workout_slug)),
				s.position
		) AS rn,
		COUNT(*) FILTER (WHERE s.score < 99) OVER (PARTITION BY s.session_id) AS match_count
	FROM scored s
)
UPDATE workout_sessions ws
SET workout_version_id = r.workout_version_id
FROM ranked r
WHERE ws.id = r.session_id
	AND ws.workout_version_id IS NULL
	AND r.rn = 1
	AND r.match_count = 1
	AND r.score < 99;

-- Backfill workout_name_snapshot from resolved workout version names.
UPDATE workout_sessions ws
SET workout_name_snapshot = pvw.name
FROM program_version_workouts pvw
WHERE ws.workout_version_id = pvw.id
	AND ws.workout_name_snapshot IS NULL;

-- ===========================================
-- Strengthen trigger for future inserts/updates
-- ===========================================

CREATE OR REPLACE FUNCTION sync_workout_session_version_links()
RETURNS TRIGGER AS $$
DECLARE
	normalized_workout_slug TEXT;
BEGIN
	IF NEW.program_version_id IS NULL THEN
		SELECT p.current_version_id
		INTO NEW.program_version_id
		FROM programs p
		WHERE p.id = NEW.program_id;
	END IF;

	IF NEW.workout_version_id IS NULL AND NEW.program_version_id IS NOT NULL THEN
		SELECT pvw.id
		INTO NEW.workout_version_id
		FROM program_version_workouts pvw
		WHERE pvw.program_version_id = NEW.program_version_id
			AND pvw.source_workout_id = NEW.workout_id
		ORDER BY pvw.position
		LIMIT 1;
	END IF;

	IF NEW.workout_version_id IS NULL
		AND NEW.program_version_id IS NOT NULL
		AND NEW.workout_name_snapshot IS NOT NULL THEN
		SELECT pvw.id
		INTO NEW.workout_version_id
		FROM program_version_workouts pvw
		WHERE pvw.program_version_id = NEW.program_version_id
			AND LOWER(TRIM(pvw.name)) = LOWER(TRIM(NEW.workout_name_snapshot))
		ORDER BY pvw.position
		LIMIT 1;
	END IF;

	-- Legacy fallback: match slug-like workout IDs (e.g. "workout-pull-strength")
	IF NEW.workout_version_id IS NULL
		AND NEW.program_version_id IS NOT NULL
		AND NEW.workout_id IS NOT NULL THEN
		normalized_workout_slug := regexp_replace(
			lower(regexp_replace(NEW.workout_id, '^workout-', '')),
			'[^a-z0-9]+',
			'-',
			'g'
		);

		WITH slug_candidates AS (
			SELECT
				pvw.id,
				pvw.position,
				regexp_replace(lower(pvw.name), '[^a-z0-9]+', '-', 'g') AS name_slug
			FROM program_version_workouts pvw
			WHERE pvw.program_version_id = NEW.program_version_id
		),
		scored_candidates AS (
			SELECT
				sc.id,
				sc.position,
				CASE
					WHEN sc.name_slug = normalized_workout_slug THEN 0
					WHEN sc.name_slug LIKE normalized_workout_slug || '-%' THEN 1
					WHEN normalized_workout_slug LIKE sc.name_slug || '-%' THEN 2
					WHEN sc.name_slug LIKE '%' || normalized_workout_slug || '%' THEN 3
					WHEN normalized_workout_slug LIKE '%' || sc.name_slug || '%' THEN 4
					ELSE 99
				END AS score,
				sc.name_slug
			FROM slug_candidates sc
		),
		best_candidate AS (
			SELECT
				scc.id,
				COUNT(*) FILTER (WHERE scc.score < 99) OVER () AS match_count,
				ROW_NUMBER() OVER (
					ORDER BY
						scc.score,
						ABS(LENGTH(scc.name_slug) - LENGTH(normalized_workout_slug)),
						scc.position
				) AS rn,
				scc.score
			FROM scored_candidates scc
		)
		SELECT bc.id
		INTO NEW.workout_version_id
		FROM best_candidate bc
		WHERE bc.rn = 1
			AND bc.match_count = 1
			AND bc.score < 99;
	END IF;

	IF NEW.workout_name_snapshot IS NULL
		AND NEW.workout_version_id IS NOT NULL THEN
		SELECT pvw.name
		INTO NEW.workout_name_snapshot
		FROM program_version_workouts pvw
		WHERE pvw.id = NEW.workout_version_id;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
