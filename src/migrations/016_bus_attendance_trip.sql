-- Tie bus attendance to a specific trip

ALTER TABLE bus_attendance
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;

-- Index for trip lookup
CREATE INDEX IF NOT EXISTS idx_bus_attendance_trip ON bus_attendance(trip_id);

-- Make uniqueness per student per trip instead of per day (keeps per-day if trip is null)
DO $$ BEGIN
  ALTER TABLE bus_attendance DROP CONSTRAINT IF EXISTS uniq_bus_attendance_per_day;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bus_attendance
  ADD CONSTRAINT uniq_bus_attendance_per_trip UNIQUE (student_id, trip_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
