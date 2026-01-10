-- Add address and coordinates to students for location fallback
DO $$ BEGIN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_students_lat_lng ON students(latitude, longitude);
