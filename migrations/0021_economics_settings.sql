-- Phase 8: deterministic economics.
--
-- Assessments are computed on read from qualification items, so nothing here
-- stores a result. What is stored is the rule set: the trust each verification
-- state earns, the Hot/Warm thresholds, the default currency and an optional
-- energy price. Every change is a new row, never an update, so any number an
-- assessment showed can be explained by the version it names.
CREATE TABLE economics_settings (
  version    INTEGER PRIMARY KEY AUTOINCREMENT,
  settings   TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
