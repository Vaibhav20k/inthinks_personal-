-- Phase 9: matching without Claude.
--
-- Stored meaning-vectors for challenges and technologies, produced by Cloudflare
-- Workers AI on the same account that holds the records. One row per record;
-- text_hash lets the engine re-embed only when the record's text changes, so
-- the free daily allowance is spent on new or edited records only.
CREATE TABLE match_embeddings (
  reference  TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('challenge', 'technology')),
  model      TEXT NOT NULL,
  text_hash  TEXT NOT NULL,
  vector     TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (reference, kind)
);
