-- Step 4: file quarantine.
--
-- Every stored file starts quarantined, including files that existed before
-- this migration. There is no free malware scanner that runs inside a Worker,
-- so release is a recorded human decision after inspection, not an automatic
-- verdict. Quarantined and rejected files are never served to participants,
-- mediators or reviewers; administrators may download them to inspect.
ALTER TABLE evidence ADD COLUMN scan_status TEXT NOT NULL DEFAULT 'quarantined'
  CHECK (scan_status IN ('quarantined', 'released', 'rejected'));
-- What the first bytes of the file actually are (see worker/file-safety.ts),
-- recorded at upload. NULL for files stored before this migration.
ALTER TABLE evidence ADD COLUMN detected_type TEXT;
ALTER TABLE evidence ADD COLUMN scan_note TEXT;
ALTER TABLE evidence ADD COLUMN scanned_by TEXT;
ALTER TABLE evidence ADD COLUMN scanned_at TEXT;

CREATE INDEX IF NOT EXISTS idx_evidence_scan ON evidence (scan_status);
