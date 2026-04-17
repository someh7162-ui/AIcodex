ALTER TABLE guides ADD COLUMN IF NOT EXISTS sub_category VARCHAR(40) NOT NULL DEFAULT '推荐';
ALTER TABLE guides ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) NOT NULL DEFAULT '图文';
ALTER TABLE guides ADD COLUMN IF NOT EXISTS location_tag VARCHAR(120) NOT NULL DEFAULT '新疆同城';
ALTER TABLE guides ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE guides ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS video_poster_url TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS summary_text TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS primary_tab VARCHAR(20) NOT NULL DEFAULT '发现';
ALTER TABLE guides ADD COLUMN IF NOT EXISTS city_tab VARCHAR(20) NOT NULL DEFAULT '同城';
ALTER TABLE guides ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS save_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS cover_aspect_ratio NUMERIC(5, 2);
ALTER TABLE guides ADD COLUMN IF NOT EXISTS badge_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;

UPDATE guides
SET images = ARRAY[image_url]
WHERE (images IS NULL OR array_length(images, 1) IS NULL)
  AND image_url IS NOT NULL
  AND image_url <> '';

UPDATE guides
SET images = ARRAY[]::TEXT[]
WHERE images IS NULL;

UPDATE guides
SET summary_text = excerpt
WHERE summary_text IS NULL OR summary_text = '';

UPDATE guides
SET location_tag = COALESCE(NULLIF(location, ''), '新疆同城')
WHERE location_tag IS NULL OR location_tag = '';

UPDATE guides
SET sub_category = CASE
  WHEN category = '自驾建议' THEN '自驾'
  WHEN category = '吃喝推荐' THEN '美食'
  WHEN category = '安全提醒' THEN '安全'
  WHEN category = '户外探险' THEN '徒步'
  WHEN category = '住宿建议' THEN '住宿'
  ELSE '推荐'
END
WHERE sub_category IS NULL OR sub_category = '' OR sub_category = '推荐';

UPDATE guides
SET content_type = CASE
  WHEN video_url IS NOT NULL AND video_url <> '' THEN '视频'
  WHEN image_url IS NOT NULL AND image_url <> '' THEN '图文'
  ELSE '文字'
END
WHERE content_type IS NULL OR content_type = '' OR content_type = '图文';

UPDATE guides
SET primary_tab = '发现'
WHERE primary_tab IS NULL OR primary_tab = '';

UPDATE guides
SET city_tab = '同城'
WHERE city_tab IS NULL OR city_tab = '';

UPDATE guides
SET cover_aspect_ratio = CASE
  WHEN content_type = '视频' THEN 1.55
  WHEN image_url IS NOT NULL AND image_url <> '' THEN 1.42
  ELSE 0.90
END
WHERE cover_aspect_ratio IS NULL;

CREATE INDEX IF NOT EXISTS idx_guides_sub_category ON guides(sub_category);
CREATE INDEX IF NOT EXISTS idx_guides_author_id_publish_date ON guides(author_id, publish_date DESC);
