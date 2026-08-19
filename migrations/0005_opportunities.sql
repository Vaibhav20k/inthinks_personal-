-- Industry opportunity pipeline.
--
-- An opportunity is a challenge paired with a technology that has been approved
-- for industry discussion. It exists from the moment that approval happens —
-- which is also the only point at which InThinks has something commercial to
-- track, since before it there is a challenge and a candidate, not an
-- opportunity.
--
-- Deliberately a separate record rather than more columns on `challenges`: one
-- challenge can produce several opportunities against different technologies,
-- and each moves at its own pace.

CREATE TABLE IF NOT EXISTS opportunities (
  reference       TEXT    PRIMARY KEY,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  challenge_ref   TEXT    NOT NULL,
  technology_ref  TEXT    NOT NULL,
  match_ref       TEXT,
  stage           TEXT    NOT NULL DEFAULT 'Match Approved',
  owner           TEXT,
  next_action     TEXT,
  next_action_due TEXT,
  -- Qualitative, never a forecast number. InThinks does not publish or record
  -- speculative deal values on a pipeline card.
  note            TEXT,
  closed_reason   TEXT,
  UNIQUE (challenge_ref, technology_ref)
);

CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities (stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_challenge ON opportunities (challenge_ref);
