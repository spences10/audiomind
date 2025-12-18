-- Podcasts (selectable datasets)
CREATE TABLE IF NOT EXISTS podcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  feed_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Episodes belong to podcasts
CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  podcast_id INTEGER NOT NULL REFERENCES podcasts(id),
  title TEXT NOT NULL,
  audio_url TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Segments are chunks of transcript text
CREATE TABLE IF NOT EXISTS segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL REFERENCES episodes(id),
  text TEXT NOT NULL,
  start_time REAL,
  end_time REAL
);

-- Vector table for embeddings (sqlite-vec)
-- Uses rowid to link to segments.id
CREATE VIRTUAL TABLE IF NOT EXISTS segments_vec USING vec0(
  embedding FLOAT[1024]
);

-- Chat conversations
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
