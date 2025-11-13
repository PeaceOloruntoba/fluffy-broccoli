-- Global unique codes registry to enforce uniqueness across board
CREATE TABLE IF NOT EXISTS unique_codes (
  code TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add email_verified to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Add verified to profiles and code columns
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS school_code TEXT UNIQUE;

ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_code TEXT UNIQUE;

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS teacher_code TEXT UNIQUE;

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS driver_code TEXT UNIQUE;
