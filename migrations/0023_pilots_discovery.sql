-- Phase 11: pilots and discovery.

-- A pilot is run by InThinks with each side separately (D10). Milestones are
-- dated steps; results are measurements taken against the problem's own
-- success criteria (qualification items), so "did it work" is decided by the
-- numbers the problem owner set, not by opinion.
CREATE TABLE pilot_milestones (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_ref TEXT NOT NULL REFERENCES opportunities(reference),
  title           TEXT NOT NULL,
  due_on          TEXT,
  status          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'missed')),
  note            TEXT,
  updated_by      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX idx_pilot_milestones ON pilot_milestones (opportunity_ref, due_on);

CREATE TABLE pilot_results (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_ref TEXT NOT NULL REFERENCES opportunities(reference),
  criterion_id    INTEGER NOT NULL REFERENCES qualification_items(id),
  measured        REAL NOT NULL,
  measured_on     TEXT NOT NULL,
  source          TEXT NOT NULL,
  note            TEXT,
  recorded_by     TEXT NOT NULL,
  recorded_at     TEXT NOT NULL,
  UNIQUE (opportunity_ref, criterion_id)
);

-- Discovery (D9): signed-in, verified solution providers can read approved
-- anonymised problem briefs. A problem is listed only when an administrator
-- lists it AND its submitter has agreed.
ALTER TABLE organizations ADD COLUMN provider_verified_at TEXT;
ALTER TABLE organizations ADD COLUMN provider_verified_by TEXT;
ALTER TABLE case_records ADD COLUMN discovery_listed INTEGER NOT NULL DEFAULT 0 CHECK (discovery_listed IN (0, 1));
ALTER TABLE case_records ADD COLUMN discovery_consent INTEGER NOT NULL DEFAULT 0 CHECK (discovery_consent IN (0, 1));

-- "We could solve this": a provider's interest, sent to InThinks only.
CREATE TABLE discovery_interests (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reference       TEXT NOT NULL REFERENCES case_records(reference),
  brief_id        INTEGER NOT NULL REFERENCES disclosure_briefs(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  email           TEXT NOT NULL,
  note            TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  UNIQUE (reference, organization_id)
);
