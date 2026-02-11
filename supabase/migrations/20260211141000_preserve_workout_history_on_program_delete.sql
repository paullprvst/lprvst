-- Preserve workout history when deleting a program.
-- Previous FK used ON DELETE CASCADE which removed all related sessions.

ALTER TABLE workout_sessions
DROP CONSTRAINT IF EXISTS workout_sessions_program_id_fkey;

ALTER TABLE workout_sessions
ALTER COLUMN program_id DROP NOT NULL;

ALTER TABLE workout_sessions
ADD CONSTRAINT workout_sessions_program_id_fkey
FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;
