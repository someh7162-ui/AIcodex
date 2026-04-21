ALTER TABLE guides
ADD COLUMN IF NOT EXISTS destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_guides_destination_id ON guides(destination_id);
