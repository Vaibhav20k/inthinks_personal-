-- Candidate matches between industry challenges and portfolio technologies.
--
-- A match is a *proposal*, never a connection. It carries the engine's analysis
-- and a decision field that only a person can move — nothing here reaches an
-- industry counterparty on the strength of the analysis alone.

CREATE TABLE IF NOT EXISTS matches (
  reference        TEXT    PRIMARY KEY,
  created_at       TEXT    NOT NULL,
  challenge_ref    TEXT    NOT NULL,
  technology_ref   TEXT    NOT NULL,

  -- Human-readable classification. Deliberately not a percentage: the brief
  -- rules out fake precision like "93.76% match".
  classification   TEXT    NOT NULL,

  -- Per-dimension fits, each one of strong / moderate / limited / unknown.
  mechanism_fit    TEXT    NOT NULL,
  application_fit  TEXT    NOT NULL,
  trl_fit          TEXT    NOT NULL,
  constraint_fit   TEXT    NOT NULL,
  ip_availability  TEXT    NOT NULL,
  development_effort TEXT  NOT NULL,

  trl_gap          INTEGER,
  ip_risk          TEXT,

  -- The analysis, as JSON arrays and prose.
  analysis         TEXT    NOT NULL,

  -- Which layers produced this, and on what model. Kept so a match can always
  -- be traced back to how it was generated.
  engine           TEXT    NOT NULL,

  -- Human-in-the-loop. Starts pending and only a person moves it.
  decision         TEXT    NOT NULL DEFAULT 'Pending',
  decided_by       TEXT,
  decided_at       TEXT,
  decision_note    TEXT,

  UNIQUE (challenge_ref, technology_ref)
);

CREATE INDEX IF NOT EXISTS idx_matches_challenge ON matches (challenge_ref, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_decision  ON matches (decision, created_at DESC);
