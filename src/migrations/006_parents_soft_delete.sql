-- Soft delete support for parents
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_parents_not_deleted ON parents((deleted_at IS NULL));
