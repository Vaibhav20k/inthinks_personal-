-- Step 6: structured qualification.
--
-- Typed, sourced, dated facts about a case: measurements, constraints,
-- attributable costs and measurable success criteria. These are the inputs
-- later deterministic economics and matching will read, so every value has a
-- unit from a fixed catalogue (worker/qualification.ts), a source, and a
-- verification state that resets whenever the value changes.
CREATE TABLE qualification_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  reference        TEXT NOT NULL REFERENCES case_records(reference),
  category         TEXT NOT NULL CHECK (category IN ('measurement', 'constraint', 'cost', 'success_criterion')),
  label            TEXT NOT NULL,
  comparator       TEXT CHECK (comparator IN ('eq', 'lt', 'lte', 'gt', 'gte', 'between')),
  value            REAL,
  value_max        REAL,
  baseline         REAL,
  unit             TEXT,
  currency         TEXT,
  period           TEXT CHECK (period IN ('one_off', 'per_month', 'per_year', 'per_unit')),
  attribution_pct  REAL CHECK (attribution_pct IS NULL OR (attribution_pct >= 0 AND attribution_pct <= 100)),
  target_date      TEXT,
  source_kind      TEXT NOT NULL CHECK (source_kind IN ('participant_statement', 'document', 'measurement_record', 'third_party', 'staff_estimate')),
  source_detail    TEXT,
  evidence_id      INTEGER REFERENCES evidence(id),
  observed_on      TEXT,
  verification     TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification IN ('unverified', 'participant_confirmed', 'document_checked', 'independently_verified', 'disputed')),
  verification_note TEXT,
  verified_by      TEXT,
  verified_at      TEXT,
  created_by       TEXT NOT NULL,
  created_role     TEXT NOT NULL CHECK (created_role IN ('staff', 'participant')),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  retired_at       TEXT
);
CREATE INDEX idx_qualification_case ON qualification_items (reference, retired_at, category);
