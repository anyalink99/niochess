CREATE TABLE IF NOT EXISTS players (
  nick TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  games INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  a_nick TEXT,
  a_outcome TEXT,
  b_nick TEXT,
  b_outcome TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_players_rating ON players (rating DESC);
