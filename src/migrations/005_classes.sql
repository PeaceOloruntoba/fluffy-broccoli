-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  school_id UUID NOT NULL,
  school_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Foreign key constraints
  CONSTRAINT fk_classes_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_classes_school_user FOREIGN KEY (school_user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Unique constraint: code per school
  CONSTRAINT unique_class_code_per_school UNIQUE(code, school_id)
);

-- Create index on school_id for faster queries
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_user_id ON classes(school_user_id);
