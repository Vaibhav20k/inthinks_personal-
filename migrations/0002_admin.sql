-- Admin layer: identity, review state, and the audit trail.

-- Operators. Roles are checked server-side on every request; the client is
-- never the authority on what a session may do.
CREATE TABLE IF NOT EXISTS users (
  email          TEXT    PRIMARY KEY,
  role           TEXT    NOT NULL,
  password_hash  TEXT,
  password_salt  TEXT,
  -- Bumped to invalidate every existing session for this user.
  token_version  INTEGER NOT NULL DEFAULT 1,
  disabled       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL,
  last_seen_at   TEXT
);

-- Review state that belongs to InThinks rather than to the submitter.
ALTER TABLE innovations ADD COLUMN internal_title    TEXT;
ALTER TABLE innovations ADD COLUMN current_trl       INTEGER;
ALTER TABLE innovations ADD COLUMN target_trl        INTEGER;
ALTER TABLE innovations ADD COLUMN acquisition_stage TEXT NOT NULL DEFAULT 'Submitted';
ALTER TABLE innovations ADD COLUMN reviewer          TEXT;
ALTER TABLE challenges  ADD COLUMN analyst           TEXT;

-- Per-dimension scoring. One row per dimension so the rubric can change
-- without a migration, and so each score carries who set it and when.
CREATE TABLE IF NOT EXISTS scores (
  reference  TEXT    NOT NULL,
  dimension  TEXT    NOT NULL,
  value      INTEGER,
  note       TEXT,
  scored_by  TEXT    NOT NULL,
  scored_at  TEXT    NOT NULL,
  PRIMARY KEY (reference, dimension)
);

-- Internal commentary. Never surfaced outside the admin app.
CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  reference  TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  author     TEXT    NOT NULL,
  created_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_reference ON notes (reference, created_at DESC);

-- Audit trail. Every read of a confidential record and every mutation lands
-- here, because "who looked at this submission" is itself a question the
-- platform has to be able to answer.
CREATE TABLE IF NOT EXISTS audit_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  at      TEXT    NOT NULL,
  actor   TEXT    NOT NULL,
  role    TEXT    NOT NULL,
  action  TEXT    NOT NULL,
  target  TEXT,
  meta    TEXT,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_at     ON audit_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log (target, at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_log (actor, at DESC);
