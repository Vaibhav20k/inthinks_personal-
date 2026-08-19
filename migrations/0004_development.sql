-- R&D development workspace.
--
-- A technology that InThinks has secured rights to gets a working record: where
-- it sits in the development sequence, what has been tried, what failed, and
-- how close each dimension of transfer readiness actually is.

ALTER TABLE innovations ADD COLUMN development_stage TEXT NOT NULL DEFAULT 'Research';

-- The development log. Failures are first-class entries, not an afterthought:
-- a log that only records successes is a brochure, and the point of this record
-- is to survive technical due diligence.
CREATE TABLE IF NOT EXISTS dev_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reference   TEXT    NOT NULL,
  kind        TEXT    NOT NULL,
  title       TEXT    NOT NULL,
  body        TEXT,
  -- The date the work happened, which is rarely the date it was written up.
  occurred_on TEXT,
  stage       TEXT,
  -- TRL asserted by this entry, when it marks an advancement.
  trl         INTEGER,
  author      TEXT    NOT NULL,
  created_at  TEXT    NOT NULL,
  -- Only published entries may ever appear on a public technology page.
  -- Defaults to private: publication is a decision, not an oversight.
  published   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dev_log_reference ON dev_log (reference, occurred_on DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dev_log_published ON dev_log (reference, published);

-- Attachments hang off a log entry. Reuses the evidence bucket and manifest so
-- there is one place files live and one path they are served through.
ALTER TABLE evidence ADD COLUMN log_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_evidence_log ON evidence (log_id);

-- Transfer readiness, per dimension. Deliberately not a single percentage:
-- "87% ready" hides which half is missing, and the missing half is the
-- question a buyer actually asks.
CREATE TABLE IF NOT EXISTS readiness (
  reference  TEXT NOT NULL,
  dimension  TEXT NOT NULL,
  status     TEXT NOT NULL,
  note       TEXT,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (reference, dimension)
);
