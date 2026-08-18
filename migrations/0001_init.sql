-- InThinks submission storage.
--
-- Routing and triage fields are real columns so the admin side can filter and
-- sort without parsing JSON; the long-form answers live in `payload` because
-- the question set will change and a wide table would need a migration every
-- time it does.

CREATE TABLE IF NOT EXISTS challenges (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reference       TEXT    NOT NULL UNIQUE,
  created_at      TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'Received',
  confidentiality TEXT    NOT NULL,
  company         TEXT    NOT NULL,
  contact_name    TEXT    NOT NULL,
  designation     TEXT,
  email           TEXT    NOT NULL,
  phone           TEXT,
  location        TEXT,
  website         TEXT,
  sector          TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  payload         TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_challenges_created ON challenges (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_status  ON challenges (status);
CREATE INDEX IF NOT EXISTS idx_challenges_sector  ON challenges (sector);

CREATE TABLE IF NOT EXISTS innovations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  reference        TEXT    NOT NULL UNIQUE,
  created_at       TEXT    NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'Submitted',
  title            TEXT    NOT NULL,
  category         TEXT    NOT NULL,
  entry_trl        INTEGER NOT NULL,
  innovator_name   TEXT    NOT NULL,
  innovator_email  TEXT    NOT NULL,
  institution      TEXT,
  institution_type TEXT,
  payload          TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_innovations_created ON innovations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_innovations_status  ON innovations (status);
CREATE INDEX IF NOT EXISTS idx_innovations_trl     ON innovations (entry_trl);

-- Evidence files live in R2; this table is the manifest that points at them.
CREATE TABLE IF NOT EXISTS evidence (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  reference      TEXT    NOT NULL,
  object_key     TEXT    NOT NULL UNIQUE,
  file_name      TEXT    NOT NULL,
  content_type   TEXT,
  size_bytes     INTEGER NOT NULL,
  created_at     TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_reference ON evidence (reference);

-- Reference sequences, one row per stream and year: 'challenge:2026'.
CREATE TABLE IF NOT EXISTS counters (
  name  TEXT    PRIMARY KEY,
  value INTEGER NOT NULL
);

-- Per-IP submission throttling. The IP is stored only as a salted hash.
CREATE TABLE IF NOT EXISTS rate_limit (
  ip_hash TEXT    NOT NULL,
  bucket  INTEGER NOT NULL,
  count   INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, bucket)
);
