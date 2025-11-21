-- Pivot relationships with school scoping

-- Driver ↔ Bus (1-1): one driver to one bus, and one bus to one driver
CREATE TABLE IF NOT EXISTS driver_buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id),
  UNIQUE(bus_id)
);
CREATE INDEX IF NOT EXISTS idx_driver_buses_school ON driver_buses(school_id);
CREATE INDEX IF NOT EXISTS idx_driver_buses_driver ON driver_buses(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_buses_bus ON driver_buses(bus_id);

-- Student → Bus (many-to-one but unique per student)
CREATE TABLE IF NOT EXISTS student_buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);
CREATE INDEX IF NOT EXISTS idx_student_buses_school ON student_buses(school_id);
CREATE INDEX IF NOT EXISTS idx_student_buses_student ON student_buses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_buses_bus ON student_buses(bus_id);

-- Teacher ↔ Class (1-1)
CREATE TABLE IF NOT EXISTS teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id),
  UNIQUE(class_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_school ON teacher_classes(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher ON teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class ON teacher_classes(class_id);

-- Student → Class (many-to-one but unique per student)
CREATE TABLE IF NOT EXISTS student_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);
CREATE INDEX IF NOT EXISTS idx_student_classes_school ON student_classes(school_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_student ON student_classes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_classes_class ON student_classes(class_id);
