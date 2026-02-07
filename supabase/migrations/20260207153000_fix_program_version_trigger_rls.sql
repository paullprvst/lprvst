-- Fix workout creation failure under RLS:
-- The BEFORE trigger tried to insert into program_versions before the new programs row existed,
-- causing program_versions INSERT policy checks to fail.

CREATE OR REPLACE FUNCTION sync_program_current_version()
RETURNS TRIGGER AS $$
DECLARE
	new_version_id UUID;
	next_version_number INTEGER;
	version_source TEXT;
BEGIN
	IF TG_OP = 'UPDATE' THEN
		IF NEW.name IS NOT DISTINCT FROM OLD.name
			AND NEW.description IS NOT DISTINCT FROM OLD.description
			AND NEW.start_date IS NOT DISTINCT FROM OLD.start_date
			AND NEW.schedule IS NOT DISTINCT FROM OLD.schedule
			AND NEW.workouts IS NOT DISTINCT FROM OLD.workouts THEN
			RETURN NEW;
		END IF;
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

	UPDATE programs
	SET current_version_id = new_version_id
	WHERE id = NEW.id;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS programs_sync_current_version_trigger ON programs;
CREATE TRIGGER programs_sync_current_version_trigger
AFTER INSERT OR UPDATE OF name, description, start_date, schedule, workouts
ON programs
FOR EACH ROW
EXECUTE FUNCTION sync_program_current_version();
