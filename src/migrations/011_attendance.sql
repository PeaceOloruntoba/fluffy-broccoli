-- Attendance schema

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present','absent','late');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- School attendance: recorded by admin or teacher
CREATE TABLE IF NOT EXISTS school_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  taken_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taken_by_role user_role NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  note TEXT,
  attendance_date DATE NOT NULL DEFAULT (now()::date),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_attendance_school ON school_attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_school_attendance_student ON school_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_school_attendance_class ON school_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_school_attendance_date ON school_attendance(attendance_date);

-- Prevent duplicate entries per student per day for school context
DO $$ BEGIN
  ALTER TABLE school_attendance
  ADD CONSTRAINT uniq_school_attendance_per_day UNIQUE (student_id, attendance_date);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bus attendance: recorded by admin or driver
CREATE TABLE IF NOT EXISTS bus_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
  taken_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taken_by_role user_role NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  note TEXT,
  attendance_date DATE NOT NULL DEFAULT (now()::date),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bus_attendance_school ON bus_attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_bus_attendance_student ON bus_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_bus_attendance_bus ON bus_attendance(bus_id);
CREATE INDEX IF NOT EXISTS idx_bus_attendance_date ON bus_attendance(attendance_date);

-- Prevent duplicate entries per student per day for bus context
DO $$ BEGIN
  ALTER TABLE bus_attendance
  ADD CONSTRAINT uniq_bus_attendance_per_day UNIQUE (student_id, attendance_date);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
