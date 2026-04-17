CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS guide_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(80) NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guide_comments_guide_id ON guide_comments(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_comments_user_id ON guide_comments(user_id);
