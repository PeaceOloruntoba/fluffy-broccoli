-- Create table for parent reminder preferences
CREATE TABLE IF NOT EXISTS parent_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pickup_enabled BOOLEAN NOT NULL DEFAULT true,
  drop_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_parent_prefs_updated_at ON parent_preferences;
CREATE TRIGGER trg_parent_prefs_updated_at
BEFORE UPDATE ON parent_preferences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
