-- Tracking schema

DO $$ BEGIN
  CREATE TYPE trip_direction AS ENUM ('pickup','dropoff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM ('planned','running','ended','canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trip_target_kind AS ENUM ('home','school');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trip_target_status AS ENUM ('pending','arriving','picked','dropped','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trip_event_type AS ENUM ('start','end','pause','resume','geofence_enter','geofence_exit','picked','dropped','sos','reached_school','left_school');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional tracking config on schools (defaults)
DO $$ BEGIN
  ALTER TABLE schools ADD COLUMN IF NOT EXISTS tracking_school_geofence_m INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE schools ADD COLUMN IF NOT EXISTS tracking_home_geofence_m INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE schools ADD COLUMN IF NOT EXISTS tracking_ping_secs INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Trips
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  direction trip_direction NOT NULL,
  status trip_status NOT NULL DEFAULT 'running',
  route_name TEXT,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  started_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ended_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_school ON trips(school_id);
CREATE INDEX IF NOT EXISTS idx_trips_bus ON trips(bus_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

-- Ensure only one running trip per bus
DO $$ BEGIN
  CREATE UNIQUE INDEX uniq_running_trip_per_bus ON trips(bus_id) WHERE status = 'running';
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- Trip targets
CREATE TABLE IF NOT EXISTS trip_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  target_kind trip_target_kind NOT NULL,
  target_lat DOUBLE PRECISION,
  target_lng DOUBLE PRECISION,
  status trip_target_status NOT NULL DEFAULT 'pending',
  order_index INTEGER,
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_targets_trip ON trip_targets(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_targets_status ON trip_targets(trip_id, status);
CREATE INDEX IF NOT EXISTS idx_trip_targets_order ON trip_targets(trip_id, order_index);

-- Trip locations
CREATE TABLE IF NOT EXISTS trip_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed_kph DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  accuracy_m DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_trip_locations_trip_time ON trip_locations(trip_id, recorded_at DESC);

-- Trip events
CREATE TABLE IF NOT EXISTS trip_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type trip_event_type NOT NULL,
  meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_trip_events_trip_time ON trip_events(trip_id, occurred_at DESC);
