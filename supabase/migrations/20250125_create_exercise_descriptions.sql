-- Exercise descriptions cache table
-- Stores AI-generated exercise instructions to avoid repeated API calls

CREATE TABLE IF NOT EXISTS exercise_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by normalized name
CREATE INDEX IF NOT EXISTS idx_exercise_descriptions_normalized_name
ON exercise_descriptions(normalized_name);

-- Enable RLS but allow public read/write for simplicity
-- (descriptions are not user-specific)
ALTER TABLE exercise_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exercise descriptions are publicly readable"
ON exercise_descriptions FOR SELECT
USING (true);

CREATE POLICY "Exercise descriptions are publicly insertable"
ON exercise_descriptions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Exercise descriptions are publicly updatable"
ON exercise_descriptions FOR UPDATE
USING (true);
