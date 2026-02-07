-- Phase 2: Immutable program versioning with normalized workout/exercise/schedule tables
-- Keeps existing programs.schedule/workouts JSON as compatibility layer during rollout.

-- ===========================================
-- Schema
-- ===========================================

CREATE TABLE IF NOT EXISTS program_versions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
	version_number INTEGER NOT NULL CHECK (version_number > 0),
	source TEXT NOT NULL DEFAULT 'modified' CHECK (source IN ('initial_import', 'generated', 'modified', 'manual')),
	name TEXT NOT NULL,
	description TEXT NOT NULL,
	start_date DATE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE (program_id, version_number)
);

CREATE TABLE IF NOT EXISTS program_version_workouts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	program_version_id UUID NOT NULL REFERENCES program_versions(id) ON DELETE CASCADE,
	source_workout_id TEXT NOT NULL,
	position INTEGER NOT NULL CHECK (position >= 0),
	name TEXT NOT NULL,
	type TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'flexibility', 'mobility', 'mixed')),
	estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0),
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE (program_version_id, position)
);

CREATE TABLE IF NOT EXISTS program_version_exercises (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	workout_version_id UUID NOT NULL REFERENCES program_version_workouts(id) ON DELETE CASCADE,
	source_exercise_id TEXT NOT NULL,
	position INTEGER NOT NULL CHECK (position >= 0),
	name TEXT NOT NULL,
	sets INTEGER NOT NULL CHECK (sets >= 1),
	reps TEXT,
	duration INTEGER CHECK (duration IS NULL OR duration > 0),
	rest_between_sets INTEGER NOT NULL CHECK (rest_between_sets >= 0),
	rest_between_exercises INTEGER NOT NULL CHECK (rest_between_exercises >= 0),
	equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
	notes TEXT,
	type TEXT NOT NULL CHECK (type IN ('warmup', 'main', 'cooldown')),
	target_muscles JSONB,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE (workout_version_id, position)
);

CREATE TABLE IF NOT EXISTS program_version_schedule (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	program_version_id UUID NOT NULL REFERENCES program_versions(id) ON DELETE CASCADE,
	day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
	workout_index INTEGER NOT NULL CHECK (workout_index >= 0),
	workout_version_id UUID REFERENCES program_version_workouts(id) ON DELETE SET NULL,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE (program_version_id, day_of_week)
);

ALTER TABLE programs
ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES program_versions(id) ON DELETE SET NULL;

ALTER TABLE workout_sessions
ADD COLUMN IF NOT EXISTS program_version_id UUID REFERENCES program_versions(id) ON DELETE SET NULL;

ALTER TABLE workout_sessions
ADD COLUMN IF NOT EXISTS workout_version_id UUID REFERENCES program_version_workouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_program_versions_program_id ON program_versions(program_id);
CREATE INDEX IF NOT EXISTS idx_program_versions_program_id_created_at ON program_versions(program_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_program_version_workouts_program_version_id ON program_version_workouts(program_version_id);
CREATE INDEX IF NOT EXISTS idx_program_version_exercises_workout_version_id ON program_version_exercises(workout_version_id);
CREATE INDEX IF NOT EXISTS idx_program_version_schedule_program_version_id ON program_version_schedule(program_version_id);
CREATE INDEX IF NOT EXISTS idx_programs_current_version_id ON programs(current_version_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_program_version_id ON workout_sessions(program_version_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_workout_version_id ON workout_sessions(workout_version_id);

-- ===========================================
-- RLS
-- ===========================================

ALTER TABLE program_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_version_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_version_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_version_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own program versions" ON program_versions;
CREATE POLICY "Users can view own program versions" ON program_versions
FOR SELECT USING (
	EXISTS (
		SELECT 1
		FROM programs p
		WHERE p.id = program_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can insert own program versions" ON program_versions;
CREATE POLICY "Users can insert own program versions" ON program_versions
FOR INSERT WITH CHECK (
	EXISTS (
		SELECT 1
		FROM programs p
		WHERE p.id = program_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can update own program versions" ON program_versions;
CREATE POLICY "Users can update own program versions" ON program_versions
FOR UPDATE USING (
	EXISTS (
		SELECT 1
		FROM programs p
		WHERE p.id = program_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can delete own program versions" ON program_versions;
CREATE POLICY "Users can delete own program versions" ON program_versions
FOR DELETE USING (
	EXISTS (
		SELECT 1
		FROM programs p
		WHERE p.id = program_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can view own program version workouts" ON program_version_workouts;
CREATE POLICY "Users can view own program version workouts" ON program_version_workouts
FOR SELECT USING (
	EXISTS (
		SELECT 1
		FROM program_versions pv
		JOIN programs p ON p.id = pv.program_id
		WHERE pv.id = program_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can insert own program version workouts" ON program_version_workouts;
CREATE POLICY "Users can insert own program version workouts" ON program_version_workouts
FOR INSERT WITH CHECK (
	EXISTS (
		SELECT 1
		FROM program_versions pv
		JOIN programs p ON p.id = pv.program_id
		WHERE pv.id = program_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can update own program version workouts" ON program_version_workouts;
CREATE POLICY "Users can update own program version workouts" ON program_version_workouts
FOR UPDATE USING (
	EXISTS (
		SELECT 1
		FROM program_versions pv
		JOIN programs p ON p.id = pv.program_id
		WHERE pv.id = program_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can delete own program version workouts" ON program_version_workouts;
CREATE POLICY "Users can delete own program version workouts" ON program_version_workouts
FOR DELETE USING (
	EXISTS (
		SELECT 1
		FROM program_versions pv
		JOIN programs p ON p.id = pv.program_id
		WHERE pv.id = program_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can view own program version exercises" ON program_version_exercises;
CREATE POLICY "Users can view own program version exercises" ON program_version_exercises
FOR SELECT USING (
	EXISTS (
		SELECT 1
		FROM program_version_workouts pvw
		JOIN program_versions pv ON pv.id = pvw.program_version_id
		JOIN programs p ON p.id = pv.program_id
		WHERE pvw.id = workout_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can insert own program version exercises" ON program_version_exercises;
CREATE POLICY "Users can insert own program version exercises" ON program_version_exercises
FOR INSERT WITH CHECK (
	EXISTS (
		SELECT 1
		FROM program_version_workouts pvw
		JOIN program_versions pv ON pv.id = pvw.program_version_id
		JOIN programs p ON p.id = pv.program_id
		WHERE pvw.id = workout_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can update own program version exercises" ON program_version_exercises;
CREATE POLICY "Users can update own program version exercises" ON program_version_exercises
FOR UPDATE USING (
	EXISTS (
		SELECT 1
		FROM program_version_workouts pvw
		JOIN program_versions pv ON pv.id = pvw.program_version_id
		JOIN programs p ON p.id = pv.program_id
		WHERE pvw.id = workout_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can delete own program version exercises" ON program_version_exercises;
CREATE POLICY "Users can delete own program version exercises" ON program_version_exercises
FOR DELETE USING (
	EXISTS (
		SELECT 1
		FROM program_version_workouts pvw
		JOIN program_versions pv ON pv.id = pvw.program_version_id
		JOIN programs p ON p.id = pv.program_id
		WHERE pvw.id = workout_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can view own program version schedule" ON program_version_schedule;
CREATE POLICY "Users can view own program version schedule" ON program_version_schedule
FOR SELECT USING (
	EXISTS (
		SELECT 1
		FROM program_versions pv
		JOIN programs p ON p.id = pv.program_id
		WHERE pv.id = program_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can insert own program version schedule" ON program_version_schedule;
CREATE POLICY "Users can insert own program version schedule" ON program_version_schedule
FOR INSERT WITH CHECK (
	EXISTS (
		SELECT 1
		FROM program_versions pv
		JOIN programs p ON p.id = pv.program_id
		WHERE pv.id = program_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can update own program version schedule" ON program_version_schedule;
CREATE POLICY "Users can update own program version schedule" ON program_version_schedule
FOR UPDATE USING (
	EXISTS (
		SELECT 1
		FROM program_versions pv
		JOIN programs p ON p.id = pv.program_id
		WHERE pv.id = program_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

DROP POLICY IF EXISTS "Users can delete own program version schedule" ON program_version_schedule;
CREATE POLICY "Users can delete own program version schedule" ON program_version_schedule
FOR DELETE USING (
	EXISTS (
		SELECT 1
		FROM program_versions pv
		JOIN programs p ON p.id = pv.program_id
		WHERE pv.id = program_version_id
			AND p.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
	)
);

-- ===========================================
-- Initial backfill for existing programs
-- ===========================================

INSERT INTO program_versions (program_id, version_number, source, name, description, start_date)
SELECT p.id, 1, 'initial_import', p.name, p.description, p.start_date
FROM programs p
WHERE NOT EXISTS (
	SELECT 1
	FROM program_versions pv
	WHERE pv.program_id = p.id
);

WITH target_versions AS (
	SELECT pv.id AS version_id, p.workouts
	FROM program_versions pv
	JOIN programs p ON p.id = pv.program_id
	WHERE pv.version_number = 1
		AND NOT EXISTS (
			SELECT 1
			FROM program_version_workouts pvw
			WHERE pvw.program_version_id = pv.id
		)
)
INSERT INTO program_version_workouts (
	program_version_id,
	source_workout_id,
	position,
	name,
	type,
	estimated_duration,
	notes
)
SELECT
	tv.version_id,
	COALESCE(NULLIF(TRIM(w.value->>'id'), ''), gen_random_uuid()::text),
	w.ordinality - 1,
	COALESCE(NULLIF(TRIM(w.value->>'name'), ''), 'Workout ' || w.ordinality::text),
	CASE
		WHEN (w.value->>'type') IN ('strength', 'cardio', 'flexibility', 'mobility', 'mixed')
			THEN w.value->>'type'
		ELSE 'mixed'
	END,
	CASE
		WHEN COALESCE(w.value->>'estimatedDuration', '') ~ '^[0-9]+$'
			AND (w.value->>'estimatedDuration')::int > 0
			THEN (w.value->>'estimatedDuration')::int
		ELSE 45
	END,
	NULLIF(TRIM(w.value->>'notes'), '')
FROM target_versions tv
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(tv.workouts, '[]'::jsonb)) WITH ORDINALITY AS w(value, ordinality);

WITH target_versions AS (
	SELECT pv.id AS version_id, p.workouts
	FROM program_versions pv
	JOIN programs p ON p.id = pv.program_id
	WHERE pv.version_number = 1
		AND NOT EXISTS (
			SELECT 1
			FROM program_version_exercises pve
			JOIN program_version_workouts pvw ON pvw.id = pve.workout_version_id
			WHERE pvw.program_version_id = pv.id
		)
),
workout_json AS (
	SELECT tv.version_id, w.value AS workout_value, (w.ordinality - 1) AS workout_position
	FROM target_versions tv
	CROSS JOIN LATERAL jsonb_array_elements(COALESCE(tv.workouts, '[]'::jsonb)) WITH ORDINALITY AS w(value, ordinality)
),
workout_targets AS (
	SELECT pvw.id AS workout_version_id, wj.workout_value
	FROM workout_json wj
	JOIN program_version_workouts pvw
		ON pvw.program_version_id = wj.version_id
		AND pvw.position = wj.workout_position
)
INSERT INTO program_version_exercises (
	workout_version_id,
	source_exercise_id,
	position,
	name,
	sets,
	reps,
	duration,
	rest_between_sets,
	rest_between_exercises,
	equipment,
	notes,
	type,
	target_muscles
)
SELECT
	wt.workout_version_id,
	COALESCE(NULLIF(TRIM(e.value->>'id'), ''), gen_random_uuid()::text),
	e.ordinality - 1,
	COALESCE(NULLIF(TRIM(e.value->>'name'), ''), 'Exercise ' || e.ordinality::text),
	CASE
		WHEN COALESCE(e.value->>'sets', '') ~ '^[0-9]+$'
			AND (e.value->>'sets')::int >= 1
			THEN (e.value->>'sets')::int
		ELSE 1
	END,
	NULLIF(TRIM(e.value->>'reps'), ''),
	CASE
		WHEN COALESCE(e.value->>'duration', '') ~ '^[0-9]+$'
			AND (e.value->>'duration')::int > 0
			THEN (e.value->>'duration')::int
		ELSE NULL
	END,
	CASE
		WHEN COALESCE(e.value->>'restBetweenSets', '') ~ '^[0-9]+$'
			AND (e.value->>'restBetweenSets')::int >= 0
			THEN (e.value->>'restBetweenSets')::int
		ELSE 60
	END,
	CASE
		WHEN COALESCE(e.value->>'restBetweenExercises', '') ~ '^[0-9]+$'
			AND (e.value->>'restBetweenExercises')::int >= 0
			THEN (e.value->>'restBetweenExercises')::int
		ELSE 90
	END,
	CASE
		WHEN jsonb_typeof(e.value->'equipment') = 'array'
			THEN e.value->'equipment'
		ELSE '[]'::jsonb
	END,
	NULLIF(TRIM(e.value->>'notes'), ''),
	CASE
		WHEN (e.value->>'type') IN ('warmup', 'main', 'cooldown')
			THEN e.value->>'type'
		ELSE 'main'
	END,
	CASE
		WHEN jsonb_typeof(e.value->'targetMuscles') = 'array'
			THEN e.value->'targetMuscles'
		ELSE NULL
	END
FROM workout_targets wt
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(wt.workout_value->'exercises', '[]'::jsonb)) WITH ORDINALITY AS e(value, ordinality);

WITH target_versions AS (
	SELECT pv.id AS version_id, p.schedule
	FROM program_versions pv
	JOIN programs p ON p.id = pv.program_id
	WHERE pv.version_number = 1
		AND NOT EXISTS (
			SELECT 1
			FROM program_version_schedule pvs
			WHERE pvs.program_version_id = pv.id
		)
),
parsed_patterns AS (
	SELECT
		tv.version_id,
		p.ordinality,
		CASE
			WHEN COALESCE(p.value->>'dayOfWeek', '') ~ '^[0-9]+$'
				AND (p.value->>'dayOfWeek')::int BETWEEN 0 AND 6
				THEN (p.value->>'dayOfWeek')::int
			ELSE 0
		END AS day_of_week,
		CASE
			WHEN COALESCE(p.value->>'workoutIndex', '') ~ '^[0-9]+$'
				AND (p.value->>'workoutIndex')::int >= 0
				THEN (p.value->>'workoutIndex')::int
			ELSE 0
		END AS workout_index
	FROM target_versions tv
	CROSS JOIN LATERAL jsonb_array_elements(COALESCE(tv.schedule->'weeklyPattern', '[]'::jsonb)) WITH ORDINALITY AS p(value, ordinality)
),
deduped_patterns AS (
	SELECT
		version_id,
		day_of_week,
		workout_index,
		ROW_NUMBER() OVER (PARTITION BY version_id, day_of_week ORDER BY ordinality) AS day_rank
	FROM parsed_patterns
)
INSERT INTO program_version_schedule (
	program_version_id,
	day_of_week,
	workout_index,
	workout_version_id
)
SELECT
	dp.version_id,
	dp.day_of_week,
	dp.workout_index,
	pvw.id
FROM deduped_patterns dp
LEFT JOIN program_version_workouts pvw
	ON pvw.program_version_id = dp.version_id
	AND pvw.position = dp.workout_index
WHERE dp.day_rank = 1;

UPDATE programs p
SET current_version_id = pv.id
FROM (
	SELECT DISTINCT ON (program_id)
		program_id,
		id
	FROM program_versions
	ORDER BY program_id, version_number DESC
) pv
WHERE p.id = pv.program_id
	AND p.current_version_id IS NULL;

UPDATE workout_sessions ws
SET program_version_id = p.current_version_id
FROM programs p
WHERE ws.program_id = p.id
	AND ws.program_version_id IS NULL;

WITH id_candidates AS (
	SELECT
		ws.id AS workout_session_id,
		pvw.id AS workout_version_id,
		ROW_NUMBER() OVER (
			PARTITION BY ws.id
			ORDER BY pvw.position
		) AS rank
	FROM workout_sessions ws
	JOIN program_version_workouts pvw
		ON pvw.program_version_id = ws.program_version_id
		AND pvw.source_workout_id = ws.workout_id
	WHERE ws.workout_version_id IS NULL
)
UPDATE workout_sessions ws
SET workout_version_id = c.workout_version_id
FROM id_candidates c
WHERE ws.id = c.workout_session_id
	AND c.rank = 1;

WITH name_candidates AS (
	SELECT
		ws.id AS workout_session_id,
		pvw.id AS workout_version_id,
		ROW_NUMBER() OVER (
			PARTITION BY ws.id
			ORDER BY pvw.position
		) AS rank
	FROM workout_sessions ws
	JOIN program_version_workouts pvw
		ON pvw.program_version_id = ws.program_version_id
		AND ws.workout_name_snapshot IS NOT NULL
		AND LOWER(TRIM(pvw.name)) = LOWER(TRIM(ws.workout_name_snapshot))
	WHERE ws.workout_version_id IS NULL
)
UPDATE workout_sessions ws
SET workout_version_id = c.workout_version_id
FROM name_candidates c
WHERE ws.id = c.workout_session_id
	AND c.rank = 1;

-- ===========================================
-- Automatic version creation on program writes
-- ===========================================

CREATE OR REPLACE FUNCTION sync_program_current_version()
RETURNS TRIGGER AS $$
DECLARE
	new_version_id UUID;
	next_version_number INTEGER;
	version_source TEXT;
BEGIN
	IF TG_OP = 'UPDATE'
		AND NEW.name IS NOT DISTINCT FROM OLD.name
		AND NEW.description IS NOT DISTINCT FROM OLD.description
		AND NEW.start_date IS NOT DISTINCT FROM OLD.start_date
		AND NEW.schedule IS NOT DISTINCT FROM OLD.schedule
		AND NEW.workouts IS NOT DISTINCT FROM OLD.workouts THEN
		RETURN NEW;
	END IF;

	IF NEW.id IS NULL THEN
		NEW.id := gen_random_uuid();
	END IF;

	SELECT COALESCE(MAX(version_number), 0) + 1
	INTO next_version_number
	FROM program_versions
	WHERE program_id = NEW.id;

	version_source := CASE
		WHEN TG_OP = 'INSERT' THEN 'generated'
		ELSE 'modified'
	END;

	INSERT INTO program_versions (
		program_id,
		version_number,
		source,
		name,
		description,
		start_date
	)
	VALUES (
		NEW.id,
		next_version_number,
		version_source,
		NEW.name,
		NEW.description,
		NEW.start_date
	)
	RETURNING id INTO new_version_id;

	INSERT INTO program_version_workouts (
		program_version_id,
		source_workout_id,
		position,
		name,
		type,
		estimated_duration,
		notes
	)
	SELECT
		new_version_id,
		COALESCE(NULLIF(TRIM(w.value->>'id'), ''), gen_random_uuid()::text),
		w.ordinality - 1,
		COALESCE(NULLIF(TRIM(w.value->>'name'), ''), 'Workout ' || w.ordinality::text),
		CASE
			WHEN (w.value->>'type') IN ('strength', 'cardio', 'flexibility', 'mobility', 'mixed')
				THEN w.value->>'type'
			ELSE 'mixed'
		END,
		CASE
			WHEN COALESCE(w.value->>'estimatedDuration', '') ~ '^[0-9]+$'
				AND (w.value->>'estimatedDuration')::int > 0
				THEN (w.value->>'estimatedDuration')::int
			ELSE 45
		END,
		NULLIF(TRIM(w.value->>'notes'), '')
	FROM jsonb_array_elements(COALESCE(NEW.workouts, '[]'::jsonb)) WITH ORDINALITY AS w(value, ordinality);

	INSERT INTO program_version_exercises (
		workout_version_id,
		source_exercise_id,
		position,
		name,
		sets,
		reps,
		duration,
		rest_between_sets,
		rest_between_exercises,
		equipment,
		notes,
		type,
		target_muscles
	)
	SELECT
		pvw.id,
		COALESCE(NULLIF(TRIM(e.value->>'id'), ''), gen_random_uuid()::text),
		e.ordinality - 1,
		COALESCE(NULLIF(TRIM(e.value->>'name'), ''), 'Exercise ' || e.ordinality::text),
		CASE
			WHEN COALESCE(e.value->>'sets', '') ~ '^[0-9]+$'
				AND (e.value->>'sets')::int >= 1
				THEN (e.value->>'sets')::int
			ELSE 1
		END,
		NULLIF(TRIM(e.value->>'reps'), ''),
		CASE
			WHEN COALESCE(e.value->>'duration', '') ~ '^[0-9]+$'
				AND (e.value->>'duration')::int > 0
				THEN (e.value->>'duration')::int
			ELSE NULL
		END,
		CASE
			WHEN COALESCE(e.value->>'restBetweenSets', '') ~ '^[0-9]+$'
				AND (e.value->>'restBetweenSets')::int >= 0
				THEN (e.value->>'restBetweenSets')::int
			ELSE 60
		END,
		CASE
			WHEN COALESCE(e.value->>'restBetweenExercises', '') ~ '^[0-9]+$'
				AND (e.value->>'restBetweenExercises')::int >= 0
				THEN (e.value->>'restBetweenExercises')::int
			ELSE 90
		END,
		CASE
			WHEN jsonb_typeof(e.value->'equipment') = 'array'
				THEN e.value->'equipment'
			ELSE '[]'::jsonb
		END,
		NULLIF(TRIM(e.value->>'notes'), ''),
		CASE
			WHEN (e.value->>'type') IN ('warmup', 'main', 'cooldown')
				THEN e.value->>'type'
			ELSE 'main'
		END,
		CASE
			WHEN jsonb_typeof(e.value->'targetMuscles') = 'array'
				THEN e.value->'targetMuscles'
			ELSE NULL
		END
	FROM jsonb_array_elements(COALESCE(NEW.workouts, '[]'::jsonb)) WITH ORDINALITY AS w(value, ordinality)
	JOIN program_version_workouts pvw
		ON pvw.program_version_id = new_version_id
		AND pvw.position = w.ordinality - 1
	CROSS JOIN LATERAL jsonb_array_elements(COALESCE(w.value->'exercises', '[]'::jsonb)) WITH ORDINALITY AS e(value, ordinality);

	WITH parsed_patterns AS (
		SELECT
			p.ordinality,
			CASE
				WHEN COALESCE(p.value->>'dayOfWeek', '') ~ '^[0-9]+$'
					AND (p.value->>'dayOfWeek')::int BETWEEN 0 AND 6
					THEN (p.value->>'dayOfWeek')::int
				ELSE 0
			END AS day_of_week,
			CASE
				WHEN COALESCE(p.value->>'workoutIndex', '') ~ '^[0-9]+$'
					AND (p.value->>'workoutIndex')::int >= 0
					THEN (p.value->>'workoutIndex')::int
				ELSE 0
			END AS workout_index
		FROM jsonb_array_elements(COALESCE(NEW.schedule->'weeklyPattern', '[]'::jsonb)) WITH ORDINALITY AS p(value, ordinality)
	),
	deduped_patterns AS (
		SELECT
			day_of_week,
			workout_index,
			ROW_NUMBER() OVER (PARTITION BY day_of_week ORDER BY ordinality) AS day_rank
		FROM parsed_patterns
	)
	INSERT INTO program_version_schedule (
		program_version_id,
		day_of_week,
		workout_index,
		workout_version_id
	)
	SELECT
		new_version_id,
		dp.day_of_week,
		dp.workout_index,
		pvw.id
	FROM deduped_patterns dp
	LEFT JOIN program_version_workouts pvw
		ON pvw.program_version_id = new_version_id
		AND pvw.position = dp.workout_index
	WHERE dp.day_rank = 1;

	NEW.current_version_id := new_version_id;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS programs_sync_current_version_trigger ON programs;
CREATE TRIGGER programs_sync_current_version_trigger
BEFORE INSERT OR UPDATE OF name, description, start_date, schedule, workouts
ON programs
FOR EACH ROW
EXECUTE FUNCTION sync_program_current_version();

-- ===========================================
-- Keep session version pointers aligned
-- ===========================================

CREATE OR REPLACE FUNCTION sync_workout_session_version_links()
RETURNS TRIGGER AS $$
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

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workout_sessions_sync_version_links_trigger ON workout_sessions;
CREATE TRIGGER workout_sessions_sync_version_links_trigger
BEFORE INSERT OR UPDATE OF program_id, program_version_id, workout_id, workout_name_snapshot
ON workout_sessions
FOR EACH ROW
EXECUTE FUNCTION sync_workout_session_version_links();
