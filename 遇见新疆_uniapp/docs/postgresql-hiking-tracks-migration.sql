ALTER TABLE guides ADD COLUMN IF NOT EXISTS hiking_track JSONB;

CREATE TABLE IF NOT EXISTS user_hiking_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  points JSONB NOT NULL DEFAULT '[]'::JSONB,
  point_count INTEGER NOT NULL DEFAULT 0,
  distance_km NUMERIC(10, 3) NOT NULL DEFAULT 0,
  duration_ms BIGINT NOT NULL DEFAULT 0,
  altitude_gain NUMERIC(10, 2) NOT NULL DEFAULT 0,
  captured_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_hiking_tracks_point_count_check CHECK (point_count >= 0),
  CONSTRAINT user_hiking_tracks_distance_check CHECK (distance_km >= 0),
  CONSTRAINT user_hiking_tracks_duration_check CHECK (duration_ms >= 0),
  CONSTRAINT user_hiking_tracks_altitude_gain_check CHECK (altitude_gain >= 0),
  CONSTRAINT user_hiking_tracks_points_array_check CHECK (jsonb_typeof(points) = 'array')
);

DROP TRIGGER IF EXISTS trg_user_hiking_tracks_set_updated_at ON user_hiking_tracks;
CREATE TRIGGER trg_user_hiking_tracks_set_updated_at
BEFORE UPDATE ON user_hiking_tracks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_hiking_tracks_user_id ON user_hiking_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hiking_tracks_user_captured_at ON user_hiking_tracks(user_id, captured_at DESC);
