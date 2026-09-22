-- Koola10 Emergent Studio — Neon migration 0001
-- Run this once in the Neon SQL editor for the project's database.
CREATE TABLE IF NOT EXISTS studio_episodes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
