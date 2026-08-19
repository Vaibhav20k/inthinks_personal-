-- Royalty management.
--
-- A royalty agreement is what an executed deal leaves behind: an obligation to
-- report and to pay, recurring for the length of the term. It is the only part
-- of the platform that keeps running after a transfer is complete, so it is a
-- record of what was reported and settled — never a projection of what might be.
--
-- Amounts are integer minor units in the deal's currency, and rates are basis
-- points, on the same reasoning as the deal room: money is not a float.

CREATE TABLE IF NOT EXISTS royalty_agreements (
  reference            TEXT    PRIMARY KEY,
  created_at           TEXT    NOT NULL,
  updated_at           TEXT    NOT NULL,
  deal_ref             TEXT    NOT NULL,
  opportunity_ref      TEXT,
  challenge_ref        TEXT    NOT NULL,
  technology_ref       TEXT    NOT NULL,

  -- What the royalty is charged on. Revenue and savings are a percentage of a
  -- reported amount; units are a fixed sum per unit, which is a different
  -- calculation and so a different stored rate.
  royalty_type         TEXT    NOT NULL DEFAULT 'Revenue-based',
  currency             TEXT    NOT NULL DEFAULT 'INR',
  rate_bp              INTEGER,
  per_unit_minor       INTEGER,
  basis                TEXT,

  minimum_annual_minor INTEGER,
  reporting_period     TEXT    NOT NULL DEFAULT 'Quarterly',

  -- Carried from the deal rather than re-entered, so the licence and the
  -- royalty record cannot describe different grants.
  term_months          INTEGER,
  term_start           TEXT,
  territory            TEXT,
  field_of_use         TEXT,

  status               TEXT    NOT NULL DEFAULT 'Active',
  ended_reason         TEXT,
  owner                TEXT,
  UNIQUE (deal_ref)
);

CREATE INDEX IF NOT EXISTS idx_royalty_status ON royalty_agreements (status, updated_at DESC);

-- One row per reporting period for the whole term, generated from the term and
-- the reporting frequency when the agreement opens. The schedule is a function
-- of the agreement, so a missed period is visibly missing rather than simply
-- never created.
--
-- `due_minor` is computed server-side from the reported figure and the rate in
-- force. It is stored rather than derived on read so that changing a rate later
-- does not silently rewrite what was already invoiced.
CREATE TABLE IF NOT EXISTS royalty_periods (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  agreement_ref     TEXT    NOT NULL,
  created_at        TEXT    NOT NULL,
  seq               INTEGER NOT NULL,
  period_start      TEXT    NOT NULL,
  period_end        TEXT    NOT NULL,

  reported_minor    INTEGER,
  reported_units    INTEGER,
  statement_received TEXT,

  due_minor         INTEGER NOT NULL DEFAULT 0,
  -- Minimum-annual top-ups, credits, corrections. Always carries a reason.
  adjustment_minor  INTEGER NOT NULL DEFAULT 0,
  adjustment_note   TEXT,

  paid_minor        INTEGER NOT NULL DEFAULT 0,
  paid_on           TEXT,

  -- Workflow state only. Whether a period is settled is derived from the
  -- amounts, so the two cannot disagree.
  status            TEXT    NOT NULL DEFAULT 'Awaiting statement',
  note              TEXT,
  UNIQUE (agreement_ref, seq)
);

CREATE INDEX IF NOT EXISTS idx_royalty_periods ON royalty_periods (agreement_ref, period_start);
