-- Phase 1: reliable intake.
--
-- 1. Idempotency. The client sends one key per submission attempt and reuses it
--    on every retry, so a double-click, a dropped response or a refresh after
--    "Submit" returns the reference already issued instead of opening a second
--    case. NULL is allowed so older clients without a key still submit.
ALTER TABLE challenges  ADD COLUMN idempotency_key TEXT;
ALTER TABLE innovations ADD COLUMN idempotency_key TEXT;
ALTER TABLE messages    ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_challenges_idem  ON challenges  (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_innovations_idem ON innovations (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_idem    ON messages    (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Submission review status, kept separate from the pipeline `status`
--    column (which mixes review with commercial stages). This is the state a
--    submitter will eventually see; it never carries internal reasoning.
ALTER TABLE challenges ADD COLUMN review_status TEXT NOT NULL DEFAULT 'submitted'
  CHECK (review_status IN ('submitted', 'under_review', 'clarification_requested', 'qualified', 'declined', 'withdrawn'));
ALTER TABLE innovations ADD COLUMN review_status TEXT NOT NULL DEFAULT 'submitted'
  CHECK (review_status IN ('submitted', 'under_review', 'clarification_requested', 'qualified', 'declined', 'withdrawn'));

CREATE INDEX IF NOT EXISTS idx_challenges_review  ON challenges  (review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_innovations_review ON innovations (review_status, created_at DESC);

-- 3. Transactional outbox. Written in the same batch as the record it
--    describes, so a stored submission always has its acknowledgement and
--    notification queued, and a failed email can never lose a submission.
--    Delivered by the request that created it (best effort) and retried by
--    the cron trigger. `payload` is cleared once delivered so the recipient's
--    address does not linger here.
CREATE TABLE IF NOT EXISTS outbox (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  kind            TEXT    NOT NULL CHECK (kind IN ('ack_email', 'notify_webhook')),
  reference       TEXT    NOT NULL,
  payload         TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT    NOT NULL,
  last_error      TEXT,
  created_at      TEXT    NOT NULL,
  sent_at         TEXT,
  UNIQUE (kind, reference)
);

CREATE INDEX IF NOT EXISTS idx_outbox_due ON outbox (status, next_attempt_at);
