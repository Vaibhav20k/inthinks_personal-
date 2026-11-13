-- Email usage cap: real Resend sends per UTC day, so the platform stays
-- within half of the provider's free tier (worker/email-quota.ts).
CREATE TABLE email_usage (
  day  TEXT PRIMARY KEY,
  sent INTEGER NOT NULL DEFAULT 0
);
