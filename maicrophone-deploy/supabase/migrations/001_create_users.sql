-- Create users table for Phase 1
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  title TEXT DEFAULT '聲樂菜鳥',
  score_rhythm INTEGER DEFAULT 0,
  score_expression INTEGER DEFAULT 0,
  score_technique INTEGER DEFAULT 0,
  score_stability INTEGER DEFAULT 0,
  score_pitch INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- Index for leaderboard queries (future use)
CREATE INDEX IF NOT EXISTS idx_users_scores ON users (score_rhythm, score_expression, score_technique, score_stability, score_pitch);
