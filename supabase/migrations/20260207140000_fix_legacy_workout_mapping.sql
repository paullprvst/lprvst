-- Fix legacy workout mapping by selecting the best unambiguous slug match
-- for unresolved workout_sessions.workout_version_id.

-- ===========================================
-- One-time repair backfill
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
			WHEN c.name_slug LIKE '%-' || c.workout_slug THEN 1
			WHEN c.name_slug LIKE '%-' || c.workout_slug || '-%' THEN 2
			WHEN c.workout_slug LIKE c.name_slug || '-%' THEN 3
			WHEN split_part(c.workout_slug, '-', 1) = split_part(c.name_slug, '-', 1)
				AND split_part(c.workout_slug, '-', 2) = split_part(c.name_slug, '-', 2)
				THEN 4
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
		LEAD(s.score) OVER (
			PARTITION BY s.session_id
			ORDER BY
				s.score,
				ABS(LENGTH(s.name_slug) - LENGTH(s.workout_slug)),
				s.position
		) AS next_score
	FROM scored s
)
UPDATE workout_sessions ws
SET workout_version_id = r.workout_version_id
FROM ranked r
WHERE ws.id = r.session_id
	AND ws.workout_version_id IS NULL
	AND r.rn = 1
	AND r.score < 99
	AND (r.next_score IS NULL OR r.score < r.next_score);

UPDATE workout_sessions ws
SET workout_name_snapshot = pvw.name
FROM program_version_workouts pvw
WHERE ws.workout_version_id = pvw.id
	AND ws.workout_name_snapshot IS NULL;

-- ===========================================
-- Strengthen trigger fallback with same strategy
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
				sc.name_slug,
				CASE
					WHEN sc.name_slug = normalized_workout_slug THEN 0
					WHEN sc.name_slug LIKE normalized_workout_slug || '-%' THEN 1
					WHEN sc.name_slug LIKE '%-' || normalized_workout_slug THEN 1
					WHEN sc.name_slug LIKE '%-' || normalized_workout_slug || '-%' THEN 2
					WHEN normalized_workout_slug LIKE sc.name_slug || '-%' THEN 3
					WHEN split_part(normalized_workout_slug, '-', 1) = split_part(sc.name_slug, '-', 1)
						AND split_part(normalized_workout_slug, '-', 2) = split_part(sc.name_slug, '-', 2)
						THEN 4
					ELSE 99
				END AS score
			FROM slug_candidates sc
		),
		ranked AS (
			SELECT
				sc.id,
				sc.score,
				ROW_NUMBER() OVER (
					ORDER BY
						sc.score,
						ABS(LENGTH(sc.name_slug) - LENGTH(normalized_workout_slug)),
						sc.position
				) AS rn,
				LEAD(sc.score) OVER (
					ORDER BY
						sc.score,
						ABS(LENGTH(sc.name_slug) - LENGTH(normalized_workout_slug)),
						sc.position
				) AS next_score
			FROM scored_candidates sc
		)
		SELECT r.id
		INTO NEW.workout_version_id
		FROM ranked r
		WHERE r.rn = 1
			AND r.score < 99
			AND (r.next_score IS NULL OR r.score < r.next_score);
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
