-- Step 5: case workflow.

-- One accountable staff owner per case, and the single next action that moves
-- it forward. Absent row = no owner yet (the health report counts these).
CREATE TABLE case_workflow (
  reference       TEXT PRIMARY KEY REFERENCES case_records(reference),
  owner_email     TEXT REFERENCES users(email),
  next_action     TEXT,
  next_action_due TEXT,
  updated_by      TEXT NOT NULL REFERENCES users(email),
  updated_at      TEXT NOT NULL
);
CREATE INDEX idx_case_workflow_owner ON case_workflow (owner_email, next_action_due);

-- Questions staff put to the submitter, and the submitter's answers. The
-- participant never sees which staff member asked.
CREATE TABLE clarification_requests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  reference     TEXT NOT NULL REFERENCES case_records(reference),
  question      TEXT NOT NULL,
  asked_by      TEXT NOT NULL REFERENCES users(email),
  asked_at      TEXT NOT NULL,
  due_at        TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'withdrawn')),
  response      TEXT,
  responded_by  TEXT REFERENCES participants(email),
  responded_at  TEXT,
  closed_by     TEXT REFERENCES users(email),
  closed_at     TEXT
);
CREATE INDEX idx_clarifications_case ON clarification_requests (reference, status);

-- Server-side drafts for verified participants. Private to their author;
-- organization membership does not reveal another member's unsent draft.
-- No files: evidence is attached at submission, never parked in a draft.
CREATE TABLE submission_drafts (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL REFERENCES participants(email),
  organization_id TEXT REFERENCES organizations(id),
  kind            TEXT NOT NULL CHECK (kind IN ('challenge', 'innovation')),
  title           TEXT NOT NULL DEFAULT '',
  payload         TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  expires_at      TEXT NOT NULL
);
CREATE INDEX idx_drafts_email ON submission_drafts (email, updated_at DESC);
