-- Exercise video cache table
-- Stores fetched YouTube exercise videos to avoid repeated API calls

CREATE TABLE IF NOT EXISTS exercise_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    videos JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_videos_normalized_name
ON exercise_videos(normalized_name);

ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view exercise videos" ON exercise_videos;
CREATE POLICY "Authenticated users can view exercise videos" ON exercise_videos
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert exercise videos" ON exercise_videos;
CREATE POLICY "Authenticated users can insert exercise videos" ON exercise_videos
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update exercise videos" ON exercise_videos;
CREATE POLICY "Authenticated users can update exercise videos" ON exercise_videos
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION update_exercise_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exercise_videos_updated_at ON exercise_videos;
CREATE TRIGGER exercise_videos_updated_at
BEFORE UPDATE ON exercise_videos
FOR EACH ROW EXECUTE FUNCTION update_exercise_videos_updated_at();
