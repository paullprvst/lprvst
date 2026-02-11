CREATE TABLE IF NOT EXISTS ai_debug_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_payload JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_debug_logs_auth_user_created_at
ON ai_debug_logs(auth_user_id, created_at DESC);

ALTER TABLE ai_debug_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai debug logs" ON ai_debug_logs;
CREATE POLICY "Users can view own ai debug logs" ON ai_debug_logs
    FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can insert own ai debug logs" ON ai_debug_logs;
CREATE POLICY "Users can insert own ai debug logs" ON ai_debug_logs
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update own ai debug logs" ON ai_debug_logs;
CREATE POLICY "Users can update own ai debug logs" ON ai_debug_logs
    FOR UPDATE USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can delete own ai debug logs" ON ai_debug_logs;
CREATE POLICY "Users can delete own ai debug logs" ON ai_debug_logs
    FOR DELETE USING (auth.uid() = auth_user_id);
