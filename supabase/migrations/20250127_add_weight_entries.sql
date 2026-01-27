-- Create weight_entries table for tracking body weight over time
CREATE TABLE IF NOT EXISTS weight_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weight DECIMAL(5,2) NOT NULL,
    recorded_at DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate entries for the same date
    CONSTRAINT unique_weight_entry_date UNIQUE (recorded_at)
);

-- Create index on recorded_at for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_weight_entries_recorded_at ON weight_entries(recorded_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_weight_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER weight_entries_updated_at
    BEFORE UPDATE ON weight_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_weight_entries_updated_at();
