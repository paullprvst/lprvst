-- Migration: Add user ownership and Row-Level Security
-- This migration adds user_id columns to tables and enables RLS for data isolation

-- ===========================================
-- PHASE 1: Add user_id columns (nullable initially for migration)
-- ===========================================

-- Add user_id to programs table
ALTER TABLE programs
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to workout_sessions table
ALTER TABLE workout_sessions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to weight_entries table
ALTER TABLE weight_entries
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update conversations user_id to reference auth.users if it exists
-- First check if there's an existing user_id column that references public.users
DO $$
BEGIN
    -- If user_id exists and references public.users, we need to update it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'user_id'
    ) THEN
        -- Drop the existing foreign key if any
        ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
        -- Add new foreign key referencing auth.users
        ALTER TABLE conversations
        ADD CONSTRAINT conversations_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    ELSE
        -- Add the column if it doesn't exist
        ALTER TABLE conversations
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add auth_user_id to users table to link app user profile to auth user
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- ===========================================
-- PHASE 2: Enable Row-Level Security
-- ===========================================

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_descriptions ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- PHASE 3: Create RLS Policies
-- ===========================================

-- Programs policies
DROP POLICY IF EXISTS "Users can view own programs" ON programs;
CREATE POLICY "Users can view own programs" ON programs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own programs" ON programs;
CREATE POLICY "Users can insert own programs" ON programs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own programs" ON programs;
CREATE POLICY "Users can update own programs" ON programs
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own programs" ON programs;
CREATE POLICY "Users can delete own programs" ON programs
    FOR DELETE USING (auth.uid() = user_id);

-- Workout sessions policies
DROP POLICY IF EXISTS "Users can view own workout sessions" ON workout_sessions;
CREATE POLICY "Users can view own workout sessions" ON workout_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own workout sessions" ON workout_sessions;
CREATE POLICY "Users can insert own workout sessions" ON workout_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own workout sessions" ON workout_sessions;
CREATE POLICY "Users can update own workout sessions" ON workout_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own workout sessions" ON workout_sessions;
CREATE POLICY "Users can delete own workout sessions" ON workout_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Weight entries policies
DROP POLICY IF EXISTS "Users can view own weight entries" ON weight_entries;
CREATE POLICY "Users can view own weight entries" ON weight_entries
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own weight entries" ON weight_entries;
CREATE POLICY "Users can insert own weight entries" ON weight_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own weight entries" ON weight_entries;
CREATE POLICY "Users can update own weight entries" ON weight_entries
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own weight entries" ON weight_entries;
CREATE POLICY "Users can delete own weight entries" ON weight_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
CREATE POLICY "Users can insert own conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
CREATE POLICY "Users can delete own conversations" ON conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Users (app profile) policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON users;
CREATE POLICY "Users can delete own profile" ON users
    FOR DELETE USING (auth.uid() = auth_user_id);

-- Exercise descriptions - shared resource, anyone authenticated can read/write
DROP POLICY IF EXISTS "Authenticated users can view exercise descriptions" ON exercise_descriptions;
CREATE POLICY "Authenticated users can view exercise descriptions" ON exercise_descriptions
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert exercise descriptions" ON exercise_descriptions;
CREATE POLICY "Authenticated users can insert exercise descriptions" ON exercise_descriptions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update exercise descriptions" ON exercise_descriptions;
CREATE POLICY "Authenticated users can update exercise descriptions" ON exercise_descriptions
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ===========================================
-- PHASE 4: Create indexes for performance
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_programs_user_id ON programs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_entries_user_id ON weight_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- ===========================================
-- NOTE: Data Migration Strategy
-- ===========================================
-- After the first user signs up, run this to assign orphaned records:
--
-- UPDATE programs SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
-- UPDATE workout_sessions SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
-- UPDATE weight_entries SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
-- UPDATE conversations SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
--
-- Then make columns NOT NULL:
-- ALTER TABLE programs ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE workout_sessions ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE weight_entries ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
