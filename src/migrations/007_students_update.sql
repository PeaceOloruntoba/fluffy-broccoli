-- Update students table to support reg_no, class_id, parent_user_id (users.id), and soft delete
DO $$ BEGIN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS reg_no TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_user_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add/adjust constraints
DO $$ BEGIN
  ALTER TABLE students ADD CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Remove old parent_id column if present, and ensure parent_user_id references users
DO $$ BEGIN
  -- Drop existing foreign key on parent_id if exists
  ALTER TABLE students DROP CONSTRAINT IF EXISTS students_parent_id_fkey;
  -- Drop parent_id column if exists
  ALTER TABLE students DROP COLUMN IF EXISTS parent_id;
END $$;

DO $$ BEGIN
  ALTER TABLE students ADD CONSTRAINT fk_students_parent_user FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_user_id ON students(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
