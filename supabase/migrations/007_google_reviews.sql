-- Google Reviews cache table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_url TEXT,
  profile_photo_url TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  time BIGINT NOT NULL,
  relative_time_description TEXT,
  show_on_homepage BOOLEAN NOT NULL DEFAULT false,
  synced_at TIMESTAMPTZ DEFAULT now()
);
