-- Koola10 Emergent Studio — Neon migration 0002
-- Nova's persistent memory vault ("the actual Jarvis" memory system).
-- Run this once in the Neon SQL editor for the project's database.
-- Safe to re-run: table/index creation is IF NOT EXISTS and seeds use
-- ON CONFLICT DO NOTHING on fixed ids.

CREATE TABLE IF NOT EXISTS nova_memories (
  id TEXT PRIMARY KEY,
  memory TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'fact',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nova_memories_updated
  ON nova_memories (updated_at DESC);

-- Seed facts (all user-provided). Fixed ids so re-running never duplicates.
INSERT INTO nova_memories (id, memory, category) VALUES
  ('seed-setup-daw',
   'Produces beats in FL Studio 25 — a personal music project, not a Spiral Academy business offering.',
   'setup'),
  ('seed-setup-flex',
   'Uses the FLEX plugin a lot when making beats.',
   'setup'),
  ('seed-setup-stock-limits',
   'Fruity Limiter and 3xOSC are unusable in their setup — give sidechain and sound-design methods that do not need them (e.g. Fruity Peak Controller for sidechaining).',
   'setup'),
  ('seed-pref-plain-english',
   'Prefers plain-English, knob-by-knob plugin explanations with no assumed music training — describe what they will hear when turning each control.',
   'preference'),
  ('seed-goal-own-plugins',
   'Rebuilding stock FL Studio plugins themselves in the mikekoola10/fl-studio-plugins repo, because stock features keep turning into paid ones — keep recommendations Image-Line-independent where possible.',
   'goal'),
  ('seed-goal-jarvis',
   'Wants Nova to become a real Jarvis-style assistant with persistent memory that knows them across conversations.',
   'goal')
ON CONFLICT (id) DO NOTHING;
