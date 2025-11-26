-- Add selector to refresh_tokens for efficient lookup
DO $$ BEGIN
  ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS selector TEXT UNIQUE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
