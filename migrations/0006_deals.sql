-- Commercial deal room.
--
-- A deal is the commercial instrument for one opportunity: what is being
-- granted, on what terms, to whom, and how far the paperwork has travelled.
-- It is private to the commercial roles — an R&D reviewer has no route to it,
-- because assessing a technology and negotiating over it are different jobs
-- and the brief keeps this workspace internal.
--
-- One deal per opportunity. If a counterparty and InThinks end up structuring
-- two separate instruments, that is two opportunities, because it is two
-- different things being transferred.
--
-- Money is stored as an integer in the currency's minor unit alongside an
-- explicit currency code. Nothing here is a forecast: these are agreed or
-- proposed terms, never a projected deal value.

CREATE TABLE IF NOT EXISTS deals (
  reference          TEXT    PRIMARY KEY,
  created_at         TEXT    NOT NULL,
  updated_at         TEXT    NOT NULL,
  opportunity_ref    TEXT    NOT NULL,
  challenge_ref      TEXT    NOT NULL,
  technology_ref     TEXT    NOT NULL,

  deal_type          TEXT    NOT NULL DEFAULT 'Licensing',
  industry           TEXT,

  currency           TEXT    NOT NULL DEFAULT 'INR',
  upfront_minor      INTEGER,
  -- Basis points, so a rate is exact rather than a float: 5.25% is 525.
  royalty_bp         INTEGER,
  royalty_basis      TEXT,

  territory          TEXT,
  field_of_use       TEXT,
  exclusivity        TEXT    NOT NULL DEFAULT 'Non-exclusive',
  term_months        INTEGER,
  term_start         TEXT,
  term_note          TEXT,

  pilot_conditions   TEXT,
  ip_rights          TEXT    NOT NULL DEFAULT 'Retained by InThinks',
  ip_rights_note     TEXT,
  manufacturing_rights TEXT  NOT NULL DEFAULT 'Not granted',
  technical_support  TEXT,

  agreement_status   TEXT    NOT NULL DEFAULT 'Not started',
  closing_status     TEXT    NOT NULL DEFAULT 'Open',
  closed_at          TEXT,
  closed_reason      TEXT,

  owner              TEXT,
  UNIQUE (opportunity_ref)
);

CREATE INDEX IF NOT EXISTS idx_deals_status ON deals (closing_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_technology ON deals (technology_ref);

-- Milestones a deal turns on. Separate rows rather than a JSON blob, because
-- each one is independently due, met or missed and gets asked about by name.
CREATE TABLE IF NOT EXISTS deal_milestones (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_ref     TEXT    NOT NULL,
  created_at   TEXT    NOT NULL,
  label        TEXT    NOT NULL,
  due          TEXT,
  status       TEXT    NOT NULL DEFAULT 'Pending',
  note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_deal_milestones ON deal_milestones (deal_ref, due);

-- The payment schedule. Amounts are agreed instalments, not expected revenue.
CREATE TABLE IF NOT EXISTS deal_payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_ref     TEXT    NOT NULL,
  created_at   TEXT    NOT NULL,
  label        TEXT    NOT NULL,
  due          TEXT,
  amount_minor INTEGER NOT NULL DEFAULT 0,
  status       TEXT    NOT NULL DEFAULT 'Scheduled',
  note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_deal_payments ON deal_payments (deal_ref, due);

-- Transfer documentation as a register: which instruments this deal needs and
-- how far each has got. It records the state of a document, not the document —
-- executed agreements live in the counterparty's and InThinks' own systems.
CREATE TABLE IF NOT EXISTS deal_documents (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_ref     TEXT    NOT NULL,
  created_at   TEXT    NOT NULL,
  kind         TEXT    NOT NULL,
  title        TEXT,
  status       TEXT    NOT NULL DEFAULT 'Required',
  dated        TEXT,
  note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_deal_documents ON deal_documents (deal_ref, kind);
