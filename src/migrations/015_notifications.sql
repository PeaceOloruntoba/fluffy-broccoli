-- Notifications and Reminders schema

-- In-app notifications feed
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Per-user channel preferences per category
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email BOOLEAN NOT NULL DEFAULT TRUE,
  sms BOOLEAN NOT NULL DEFAULT FALSE,
  push BOOLEAN NOT NULL DEFAULT TRUE,
  inapp BOOLEAN NOT NULL DEFAULT TRUE,
  -- simple category switches can be stored in JSON for flexibility
  per_category JSONB NOT NULL DEFAULT '{}'::jsonb,
  quiet_hours JSONB DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Push device tokens (FCM/APNs)
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  token TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

-- Parent-configured proximity reminders per student
CREATE TABLE IF NOT EXISTS parent_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  pickup_radius_km NUMERIC(6,2) NOT NULL DEFAULT 5.00,
  dropoff_radius_km NUMERIC(6,2) NOT NULL DEFAULT 10.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_user_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_parent_reminders_school ON parent_reminders(school_id);
