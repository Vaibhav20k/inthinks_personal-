-- Records InThinks writes, rather than records that arrived.
--
-- Until now a public technology page had to have a submission behind it: the
-- profile carried the prose and joined to `innovations` for TRL, domain and
-- stage. That join is deliberate and stays — it is what stops a public page
-- claiming a maturity the workspace disagrees with.
--
-- But the platform also needs records nobody submitted: the illustrative set
-- that keeps the explorers from launching empty, and technologies InThinks
-- sources itself. Those have no workspace record to disagree with, so for them
-- the same facts are authored on the profile.
--
-- `origin` is which of the two a row is, and it decides where TRL is read
-- from. The authored columns are null for a submission-derived profile and
-- must never be consulted for one.

ALTER TABLE technology_profiles ADD COLUMN origin TEXT NOT NULL DEFAULT 'submission';
ALTER TABLE technology_profiles ADD COLUMN record_type TEXT NOT NULL DEFAULT 'live';
ALTER TABLE technology_profiles ADD COLUMN authored_domain_code TEXT;
ALTER TABLE technology_profiles ADD COLUMN authored_entry_trl INTEGER;
ALTER TABLE technology_profiles ADD COLUMN authored_current_trl INTEGER;
ALTER TABLE technology_profiles ADD COLUMN authored_target_trl INTEGER;
ALTER TABLE technology_profiles ADD COLUMN authored_stage TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_origin ON technology_profiles (origin);
CREATE INDEX IF NOT EXISTS idx_profiles_record_type ON technology_profiles (record_type);

-- The public face of an industrial challenge.
--
-- The same bridge the technology side has, for the same reason: what a company
-- submits is confidential and written for assessors, and what the site shows
-- is written by InThinks, about the problem, for an innovator reading it. One
-- is not a projection of the other.
--
-- Every column here is publishable by definition. The company, the contact,
-- the plant and the commercial impact live on `challenges` and have no route
-- into this table — which is how "the problem is public, the company is not"
-- is enforced in the schema rather than in a template.

CREATE TABLE IF NOT EXISTS challenge_profiles (
  reference       TEXT    PRIMARY KEY,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,

  -- 'submission' when a real challenge sits behind it, 'authored' when
  -- InThinks wrote the profile without one.
  origin          TEXT    NOT NULL DEFAULT 'submission',
  record_type     TEXT    NOT NULL DEFAULT 'live',

  slug            TEXT    NOT NULL UNIQUE,
  title           TEXT    NOT NULL,

  sector          TEXT    NOT NULL DEFAULT '',
  priority_area   TEXT    NOT NULL DEFAULT '',
  target          TEXT    NOT NULL DEFAULT '',

  summary         TEXT    NOT NULL DEFAULT '',
  problem         TEXT    NOT NULL DEFAULT '',
  current_approach TEXT   NOT NULL DEFAULT '',
  target_outcome  TEXT    NOT NULL DEFAULT '',

  -- JSON arrays, like the technology profile's own lists.
  constraints     TEXT    NOT NULL DEFAULT '[]',
  environment     TEXT    NOT NULL DEFAULT '[]',
  impact          TEXT    NOT NULL DEFAULT '[]',
  outcomes        TEXT    NOT NULL DEFAULT '[]',

  minimum_trl     INTEGER NOT NULL DEFAULT 4,
  status          TEXT    NOT NULL DEFAULT 'Open challenge',

  published       INTEGER NOT NULL DEFAULT 0,
  published_at    TEXT,
  published_by    TEXT
);

CREATE INDEX IF NOT EXISTS idx_challenge_profiles_published ON challenge_profiles (published);
CREATE INDEX IF NOT EXISTS idx_challenge_profiles_sector ON challenge_profiles (sector);
CREATE INDEX IF NOT EXISTS idx_challenge_profiles_status ON challenge_profiles (status);
CREATE INDEX IF NOT EXISTS idx_challenge_profiles_type ON challenge_profiles (record_type);
