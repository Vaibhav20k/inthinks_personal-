-- The public face of a match.
--
-- The `matches` table is the engine's: it pairs a submitted challenge with an
-- innovation, carries per-dimension fits and a decision that only a person
-- moves. None of it is publishable. It names internal references, its
-- classification is engine vocabulary, and most rows in it are candidates
-- nobody has looked at yet.
--
-- This table is what the site shows: a relationship between two records that
-- are already public, written by InThinks for an outside reader. The two ends
-- are profile references, not submission references, because a public match
-- can join records nobody submitted — the illustrative set has no engine rows
-- behind it at all.
--
-- `source_match_ref` is the link back when there is one. It is nullable
-- precisely because an authored match has no engine row, and it is what makes
-- "no raw AI candidate becomes public" checkable: where a source exists, its
-- decision has to have reached approval before this can publish.

CREATE TABLE IF NOT EXISTS match_profiles (
  reference        TEXT    PRIMARY KEY,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL,

  record_type      TEXT    NOT NULL DEFAULT 'live',

  -- Both ends are profile references: challenge_profiles / technology_profiles.
  problem_ref      TEXT    NOT NULL,
  technology_ref   TEXT    NOT NULL,

  -- The engine row this came from, when it came from one.
  source_match_ref TEXT,

  slug             TEXT    NOT NULL UNIQUE,

  -- What the site calls it. Words, never a percentage: averaging a strong
  -- mechanism fit against a moderate TRL fit gives a number describing neither.
  match_class      TEXT    NOT NULL DEFAULT 'Candidate match',
  status           TEXT    NOT NULL DEFAULT 'Technical review',

  rationale        TEXT    NOT NULL DEFAULT '',
  next_step        TEXT    NOT NULL DEFAULT '',
  open_questions   TEXT    NOT NULL DEFAULT '[]',

  -- [{ dimension, rating }] — the same shape the public page renders.
  fit              TEXT    NOT NULL DEFAULT '[]',
  development_required TEXT NOT NULL DEFAULT 'Medium',

  published        INTEGER NOT NULL DEFAULT 0,
  published_at     TEXT,
  published_by     TEXT,

  -- One public match per pair. Two rows joining the same two records would
  -- render as two matches saying the same thing.
  UNIQUE (problem_ref, technology_ref)
);

CREATE INDEX IF NOT EXISTS idx_match_profiles_published ON match_profiles (published);
CREATE INDEX IF NOT EXISTS idx_match_profiles_problem ON match_profiles (problem_ref);
CREATE INDEX IF NOT EXISTS idx_match_profiles_technology ON match_profiles (technology_ref);
CREATE INDEX IF NOT EXISTS idx_match_profiles_type ON match_profiles (record_type);
