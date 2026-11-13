-- Verified mailbox identity is separate from privileged staff identity.
CREATE TABLE participants (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  verified_at TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0,1))
);
CREATE TABLE participant_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES participants(email),
  expires_at TEXT NOT NULL
);
CREATE INDEX participant_sessions_email ON participant_sessions(email);
CREATE TABLE verification_challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed INTEGER NOT NULL DEFAULT 0 CHECK (consumed IN (0,1))
);
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE memberships (
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL REFERENCES participants(email),
  role TEXT NOT NULL CHECK (role IN ('owner','contributor')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  PRIMARY KEY (organization_id,email)
);
CREATE INDEX memberships_email ON memberships(email,active);
CREATE TABLE organization_invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL COLLATE NOCASE,
  invited_by TEXT NOT NULL REFERENCES participants(email),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  UNIQUE(organization_id,email)
);
-- Existing anonymous records remain unowned until their contact verifies email.
CREATE TABLE case_records (
  reference TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('challenge','innovation')),
  organization_id TEXT REFERENCES organizations(id),
  created_by TEXT REFERENCES participants(email)
);
INSERT INTO case_records(reference,kind) SELECT reference,'challenge' FROM challenges;
INSERT INTO case_records(reference,kind) SELECT reference,'innovation' FROM innovations;
CREATE INDEX case_records_organization ON case_records(organization_id);
CREATE TABLE case_grants (
  reference TEXT NOT NULL REFERENCES case_records(reference),
  email TEXT NOT NULL REFERENCES participants(email),
  PRIMARY KEY(reference,email)
);
CREATE TABLE case_assignments (
  reference TEXT NOT NULL REFERENCES case_records(reference),
  staff_email TEXT NOT NULL REFERENCES users(email),
  assigned_by TEXT NOT NULL REFERENCES users(email),
  assigned_at TEXT NOT NULL,
  PRIMARY KEY(reference,staff_email)
);
-- Reviewers receive approved technical briefs, never an automatic redaction of
-- confidential free text (which can itself contain names and commercial terms).
CREATE TABLE case_review_briefs (
  reference TEXT PRIMARY KEY REFERENCES case_records(reference),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  approved_by TEXT NOT NULL REFERENCES users(email),
  approved_at TEXT NOT NULL
);
CREATE TABLE reviewer_evidence_approvals (
  evidence_id INTEGER PRIMARY KEY REFERENCES evidence(id),
  approved_by TEXT NOT NULL REFERENCES users(email),
  approved_at TEXT NOT NULL
);
