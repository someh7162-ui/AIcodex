CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS guide_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT guide_likes_unique_pair UNIQUE (guide_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_guide_likes_guide_id ON guide_likes(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_likes_user_id ON guide_likes(user_id);
