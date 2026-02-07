-- Supabase Schema for AI Fitness Coach
-- Run this in the Supabase SQL Editor after creating your project

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objectives TEXT NOT NULL,
    profile JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs table
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    start_date DATE NOT NULL,
    schedule JSONB NOT NULL,
    workouts JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('onboarding', 'reevaluation')),
    messages JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout sessions table
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id TEXT NOT NULL,
    workout_name_snapshot TEXT,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    program_version_id UUID,
    workout_version_id UUID,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'abandoned')),
    exercises JSONB NOT NULL DEFAULT '[]'
);

-- Program versioning (Phase 2)
CREATE TABLE program_versions (
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

CREATE TABLE program_version_workouts (
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

CREATE TABLE program_version_exercises (
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

CREATE TABLE program_version_schedule (
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
ADD CONSTRAINT workout_sessions_program_version_id_fkey
FOREIGN KEY (program_version_id) REFERENCES program_versions(id) ON DELETE SET NULL;

ALTER TABLE workout_sessions
ADD CONSTRAINT workout_sessions_workout_version_id_fkey
FOREIGN KEY (workout_version_id) REFERENCES program_version_workouts(id) ON DELETE SET NULL;

-- Indexes for common queries
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_workout_sessions_program ON workout_sessions(program_id);
CREATE INDEX idx_workout_sessions_status ON workout_sessions(status);
CREATE INDEX idx_workout_sessions_completed ON workout_sessions(completed_at);
CREATE INDEX idx_program_versions_program_id ON program_versions(program_id);
CREATE INDEX idx_program_version_workouts_program_version_id ON program_version_workouts(program_version_id);
CREATE INDEX idx_program_version_exercises_workout_version_id ON program_version_exercises(workout_version_id);
CREATE INDEX idx_program_version_schedule_program_version_id ON program_version_schedule(program_version_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
