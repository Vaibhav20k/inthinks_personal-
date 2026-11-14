-- Phase 7: adaptive text intake.
--
-- Figures the engine read from a submission's own text, waiting for the
-- submitter to confirm. A suggestion is never a figure: only when the
-- participant accepts it does it become a qualification item (source
-- "participant_statement"). `quote` is the exact passage the number came
-- from, so the participant and staff can see why it was suggested.
CREATE TABLE intake_suggestions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reference   TEXT NOT NULL REFERENCES case_records(reference),
  item_key    TEXT NOT NULL,
  value       REAL NOT NULL,
  unit        TEXT NOT NULL,
  quote       TEXT NOT NULL,
  model       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'dismissed')),
  created_at  TEXT NOT NULL,
  decided_at  TEXT,
  UNIQUE (reference, item_key)
);
