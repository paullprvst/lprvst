-- Migration: Standardize user references
-- Change all tables to reference users(id) instead of auth.users(id) directly

-- Step 1: Drop existing foreign keys and policies
ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_user_id_fkey;
ALTER TABLE workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_user_id_fkey;
ALTER TABLE weight_entries DROP CONSTRAINT IF EXISTS weight_entries_user_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;

DROP POLICY IF EXISTS "Users can view own programs" ON programs;
DROP POLICY IF EXISTS "Users can insert own programs" ON programs;
DROP POLICY IF EXISTS "Users can update own programs" ON programs;
DROP POLICY IF EXISTS "Users can delete own programs" ON programs;

DROP POLICY IF EXISTS "Users can view own workout sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can insert own workout sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can update own workout sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Users can delete own workout sessions" ON workout_sessions;

DROP POLICY IF EXISTS "Users can view own weight entries" ON weight_entries;
DROP POLICY IF EXISTS "Users can insert own weight entries" ON weight_entries;
DROP POLICY IF EXISTS "Users can update own weight entries" ON weight_entries;
DROP POLICY IF EXISTS "Users can delete own weight entries" ON weight_entries;

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

-- Step 2: Migrate existing data (update user_id from auth.users.id to users.id)
UPDATE programs p
SET user_id = u.id
FROM users u
WHERE p.user_id = u.auth_user_id AND p.user_id IS NOT NULL;

UPDATE workout_sessions ws
SET user_id = u.id
FROM users u
WHERE ws.user_id = u.auth_user_id AND ws.user_id IS NOT NULL;

UPDATE weight_entries we
SET user_id = u.id
FROM users u
WHERE we.user_id = u.auth_user_id AND we.user_id IS NOT NULL;

UPDATE conversations c
SET user_id = u.id
FROM users u
WHERE c.user_id = u.auth_user_id AND c.user_id IS NOT NULL;

-- Step 3: Add new foreign keys referencing users table
ALTER TABLE programs
ADD CONSTRAINT programs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE workout_sessions
ADD CONSTRAINT workout_sessions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE weight_entries
ADD CONSTRAINT weight_entries_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE conversations
ADD CONSTRAINT conversations_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 4: Create new RLS policies that join through users table
CREATE POLICY "Users can view own programs" ON programs
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own programs" ON programs
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own programs" ON programs
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own programs" ON programs
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can view own workout sessions" ON workout_sessions
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own workout sessions" ON workout_sessions
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own workout sessions" ON workout_sessions
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own workout sessions" ON workout_sessions
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can view own weight entries" ON weight_entries
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own weight entries" ON weight_entries
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own weight entries" ON weight_entries
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own weight entries" ON weight_entries
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own conversations" ON conversations
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own conversations" ON conversations
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
