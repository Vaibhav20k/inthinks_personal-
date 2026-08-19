-- Public technology profiles.
--
-- The bridge between the internal record and the public site — and it is a
-- bridge rather than a projection, because a submission cannot be published.
-- What an innovator writes for evaluation is confidential and written for
-- assessors; a public brief is written by InThinks, about the technology, for
-- an industrial reader. So the narrative fields here are authored, not copied.
--
-- What is *not* authored is anything the internal record already knows: TRL,
-- development stage and domain are derived on read, so a public page cannot
-- claim a maturity the workspace disagrees with.
--
-- One profile per innovation. Publication is an explicit act with its own
-- audit action; an unpublished profile is a draft that no public route serves.

CREATE TABLE IF NOT EXISTS technology_profiles (
  reference        TEXT    PRIMARY KEY,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL,

  -- The public identity. Deliberately separate from the submitted title, which
  -- often names the institution's project rather than the technology.
  slug             TEXT    NOT NULL UNIQUE,
  name             TEXT    NOT NULL,

  thesis           TEXT    NOT NULL DEFAULT '',
  problem          TEXT    NOT NULL DEFAULT '',
  principle        TEXT    NOT NULL DEFAULT '',
  why_it_matters   TEXT    NOT NULL DEFAULT '',
  validation       TEXT    NOT NULL DEFAULT '',

  -- JSON arrays, validated against the site's own vocabularies on write.
  applications     TEXT    NOT NULL DEFAULT '[]',
  sectors          TEXT    NOT NULL DEFAULT '[]',
  outcomes         TEXT    NOT NULL DEFAULT '[]',
  next_milestones  TEXT    NOT NULL DEFAULT '[]',

  ip_status        TEXT    NOT NULL DEFAULT 'To Be Confirmed',
  -- Authored rather than derived from the opportunity pipeline on purpose: a
  -- transfer status computed from live deals would let a reader infer that a
  -- technology is in negotiation, which is exactly what the pipeline is
  -- private to avoid.
  transfer_status  TEXT    NOT NULL DEFAULT 'Under Development',

  published        INTEGER NOT NULL DEFAULT 0,
  published_at     TEXT,
  published_by     TEXT
);

CREATE INDEX IF NOT EXISTS idx_profiles_published ON technology_profiles (published, updated_at DESC);
