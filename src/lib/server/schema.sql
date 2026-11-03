-- Loaded on every connection, so every statement must be idempotent.
-- Needs the sqlite-vec extension loaded first (see db.ts).

-- An audio file or recording in the library
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  source_url TEXT,
  duration REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One transcription run of a media item. A media item can have several,
-- e.g. Deepgram and OpenAI side by side.
CREATE TABLE IF NOT EXISTS transcripts (
  id INTEGER PRIMARY KEY,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('deepgram', 'openai')),
  model TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS transcripts_media_id
  ON transcripts(media_id);

-- Chunks of transcript text; the unit that gets embedded and searched
CREATE TABLE IF NOT EXISTS segments (
  id INTEGER PRIMARY KEY,
  transcript_id INTEGER NOT NULL
    REFERENCES transcripts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  speaker INTEGER,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  text TEXT NOT NULL,
  UNIQUE (transcript_id, position)
);

-- Embeddings keyed by segments.id (OpenAI text-embedding-3-small)
CREATE VIRTUAL TABLE IF NOT EXISTS segments_vec USING vec0(
  embedding float[1536] distance_metric=cosine
);

-- Keyword search over segments.text
CREATE VIRTUAL TABLE IF NOT EXISTS segments_fts USING fts5(
  text,
  content='segments',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS segments_after_insert
AFTER INSERT ON segments BEGIN
  INSERT INTO segments_fts (rowid, text) VALUES (new.id, new.text);
END;

-- Virtual tables don't follow foreign keys, so clean them up here
CREATE TRIGGER IF NOT EXISTS segments_after_delete
AFTER DELETE ON segments BEGIN
  INSERT INTO segments_fts (segments_fts, rowid, text)
    VALUES ('delete', old.id, old.text);
  DELETE FROM segments_vec WHERE rowid = old.id;
END;

-- Chat conversations (messages are AI SDK UIMessage JSON)
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
