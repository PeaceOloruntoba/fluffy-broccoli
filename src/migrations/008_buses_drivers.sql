-- Update buses to have name, plate_number, code, deleted_at
DO $$ BEGIN
  ALTER TABLE buses RENAME COLUMN label TO name;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE buses ADD COLUMN IF NOT EXISTS name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE buses ADD COLUMN IF NOT EXISTS plate_number TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE buses ADD COLUMN IF NOT EXISTS code TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE buses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_buses_code ON buses(code);
CREATE INDEX IF NOT EXISTS idx_buses_school_id ON buses(school_id);

-- Update drivers: add code and deleted_at
DO $$ BEGIN
  ALTER TABLE drivers ADD COLUMN IF NOT EXISTS code TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE drivers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE drivers ADD COLUMN IF NOT EXISTS name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_drivers_code ON drivers(code);
