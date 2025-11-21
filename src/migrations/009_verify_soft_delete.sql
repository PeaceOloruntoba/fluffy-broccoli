-- Global soft-delete columns and verification flags, plus users.phone and buses fields

-- Users: add phone, deleted_at
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Schools: verified, deleted_at
DO $$ BEGIN
  ALTER TABLE schools ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE schools ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Parents: verified, deleted_at
DO $$ BEGIN
  ALTER TABLE parents ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE parents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Teachers: verified, deleted_at
DO $$ BEGIN
  ALTER TABLE teachers ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE teachers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Drivers: name, phone, verified, deleted_at
DO $$ BEGIN
  ALTER TABLE drivers ADD COLUMN IF NOT EXISTS name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE drivers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Buses: ensure required columns and soft delete
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

-- Students: deleted_at (if not already), parent_user_id/class_id handled in 006
DO $$ BEGIN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Classes: deleted_at
DO $$ BEGIN
  ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Drivers/Teachers/Parents verified index (optional)
CREATE INDEX IF NOT EXISTS idx_parents_verified ON parents(verified);
CREATE INDEX IF NOT EXISTS idx_teachers_verified ON teachers(verified);
CREATE INDEX IF NOT EXISTS idx_drivers_verified ON drivers(verified);
