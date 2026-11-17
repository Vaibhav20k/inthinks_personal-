-- Phase 10: controlled disclosure and engagement.
--
-- Rules from the phase 0 audit (§5.1, D9–D11):
--  * The two sides never learn each other's identity, at any stage. InThinks
--    is the party each side deals with.
--  * What one side sees of the other is an anonymised brief that staff wrote
--    and an administrator approved — never the raw submission text.
--  * Sharing is per opportunity, per side and per brief version.
--  * Submitters can mark figures "InThinks only"; those never reach a brief.

-- Versioned anonymised briefs. An approved version is never edited; a change
-- is a new version, and older approved versions become 'superseded'.
CREATE TABLE disclosure_briefs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  reference    TEXT NOT NULL REFERENCES case_records(reference),
  version      INTEGER NOT NULL,
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL,
  figure_ids   TEXT NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'approved', 'superseded')),
  written_by   TEXT NOT NULL,
  written_at   TEXT NOT NULL,
  proposed_by  TEXT,
  proposed_at  TEXT,
  approved_by  TEXT,
  approved_at  TEXT,
  UNIQUE (reference, version)
);
CREATE INDEX idx_disclosure_briefs_reference ON disclosure_briefs (reference, status);

-- D11: a figure the submitter keeps between themselves and InThinks.
ALTER TABLE qualification_items ADD COLUMN internal_only INTEGER NOT NULL DEFAULT 0 CHECK (internal_only IN (0, 1));

-- What kind of engagement an opportunity is.
ALTER TABLE opportunities ADD COLUMN engagement_type TEXT
  CHECK (engagement_type IS NULL OR engagement_type IN ('scouting', 'development', 'licensing', 'pilot'));

-- Each side of an opportunity, as InThinks deals with it. `brief_id` is the
-- counterpart's approved brief shown to this side, pinned to that version.
CREATE TABLE engagement_sides (
  opportunity_ref TEXT NOT NULL REFERENCES opportunities(reference),
  side            TEXT NOT NULL CHECK (side IN ('problem', 'solution')),
  brief_id        INTEGER REFERENCES disclosure_briefs(id),
  shared_by       TEXT,
  shared_at       TEXT,
  revoked_at      TEXT,
  response        TEXT NOT NULL DEFAULT 'pending' CHECK (response IN ('pending', 'interested', 'more_info', 'declined')),
  response_note   TEXT,
  responded_by    TEXT,
  responded_at    TEXT,
  next_action     TEXT,
  next_action_due TEXT,
  PRIMARY KEY (opportunity_ref, side)
);
