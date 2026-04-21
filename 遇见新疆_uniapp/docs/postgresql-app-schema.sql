CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL,
  password_hash TEXT NOT NULL,
  nickname VARCHAR(60) NOT NULL,
  avatar_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_status_check CHECK (status IN ('active', 'disabled', 'pending'))
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_name VARCHAR(120),
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_follows_unique_pair UNIQUE (follower_id, following_id),
  CONSTRAINT user_follows_not_self CHECK (follower_id <> following_id)
);

CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  location VARCHAR(160) NOT NULL,
  region VARCHAR(80) NOT NULL,
  category VARCHAR(80) NOT NULL,
  rating NUMERIC(2, 1),
  longitude NUMERIC(10, 6),
  latitude NUMERIC(10, 6),
  description TEXT NOT NULL,
  image_url TEXT,
  weather JSONB NOT NULL DEFAULT '{}'::JSONB,
  tips TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  suggestion TEXT,
  live_title VARCHAR(160),
  live_hint TEXT,
  live_keyword VARCHAR(160),
  culture_overview TEXT,
  culture_history TEXT,
  culture_highlights TEXT,
  recommended_season VARCHAR(120),
  recommended_stay VARCHAR(120),
  suitable_audience TEXT,
  ticket_reference TEXT,
  open_hours TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT destinations_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT destinations_rating_check CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  CONSTRAINT destinations_longitude_check CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CONSTRAINT destinations_latitude_check CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90))
);

CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL,
  destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(80) NOT NULL,
  sub_category VARCHAR(40) NOT NULL DEFAULT '推荐',
  content_type VARCHAR(20) NOT NULL DEFAULT '图文',
  read_time VARCHAR(60),
  author VARCHAR(80) NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_avatar_url TEXT,
  publish_date DATE,
  views VARCHAR(30) NOT NULL DEFAULT '0',
  likes VARCHAR(30) NOT NULL DEFAULT '0',
  likes_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  location VARCHAR(120),
  location_tag VARCHAR(160),
  image_url TEXT,
  images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  video_url TEXT,
  video_poster_url TEXT,
  hiking_track JSONB,
  excerpt TEXT NOT NULL,
  summary_text TEXT,
  highlights TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  tips TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  primary_tab VARCHAR(20) NOT NULL DEFAULT '发现',
  city_tab VARCHAR(20) NOT NULL DEFAULT '同城',
  cover_aspect_ratio NUMERIC(6, 3),
  badge_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT guides_slug_unique UNIQUE (slug),
  CONSTRAINT guides_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS guide_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  paragraphs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT guide_sections_unique_sort UNIQUE (guide_id, sort_order)
);

CREATE TABLE IF NOT EXISTS guide_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(80) NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guide_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT guide_likes_unique_pair UNIQUE (guide_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_favorites_target_type_check CHECK (target_type IN ('destination', 'guide')),
  CONSTRAINT user_favorites_unique_target UNIQUE (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS user_destination_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  visited_at DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_destination_visits_unique_destination UNIQUE (user_id, destination_id)
);

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_destinations_set_updated_at ON destinations;
CREATE TRIGGER trg_destinations_set_updated_at
BEFORE UPDATE ON destinations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_guides_set_updated_at ON guides;
CREATE TRIGGER trg_guides_set_updated_at
BEFORE UPDATE ON guides
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_guide_sections_set_updated_at ON guide_sections;
CREATE TRIGGER trg_guide_sections_set_updated_at
BEFORE UPDATE ON guide_sections
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_destination_visits_set_updated_at ON user_destination_visits;
CREATE TRIGGER trg_user_destination_visits_set_updated_at
BEFORE UPDATE ON user_destination_visits
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_hiking_tracks_set_updated_at ON user_hiking_tracks;
CREATE TRIGGER trg_user_hiking_tracks_set_updated_at
BEFORE UPDATE ON user_hiking_tracks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON user_follows(following_id);

CREATE INDEX IF NOT EXISTS idx_destinations_region ON destinations(region);
CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);
CREATE INDEX IF NOT EXISTS idx_destinations_status_sort ON destinations(status, sort_order);
CREATE INDEX IF NOT EXISTS idx_destinations_lower_name ON destinations(LOWER(name));

CREATE INDEX IF NOT EXISTS idx_guides_category ON guides(category);
CREATE INDEX IF NOT EXISTS idx_guides_sub_category ON guides(sub_category);
CREATE INDEX IF NOT EXISTS idx_guides_author_id ON guides(author_id);
CREATE INDEX IF NOT EXISTS idx_guides_status_publish_date ON guides(status, publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_guides_status_sort ON guides(status, sort_order);

CREATE INDEX IF NOT EXISTS idx_guide_sections_guide_id ON guide_sections(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_comments_guide_id ON guide_comments(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_comments_user_id ON guide_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_guide_likes_guide_id ON guide_likes(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_likes_user_id ON guide_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hiking_tracks_user_id ON user_hiking_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hiking_tracks_user_captured_at ON user_hiking_tracks(user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_target ON user_favorites(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_user_destination_visits_user_id ON user_destination_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_destination_visits_destination_id ON user_destination_visits(destination_id);
CREATE INDEX IF NOT EXISTS idx_guides_destination_id ON guides(destination_id);
