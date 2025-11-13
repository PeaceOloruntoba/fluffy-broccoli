-- Soft delete support for schools
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_schools_not_deleted ON schools((deleted_at IS NULL));
