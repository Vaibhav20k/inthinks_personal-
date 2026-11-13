# Implementation checkpoint: steps 1–3

13 November 2026. Target: `Vaibhav20k/inthinks_personal-`, branch
`phase-1-reliable-intake` only. No merge or push to `main`.

This checkpoint follows the numbered 12-step sequence agreed in the chat, not
the P0/P1/P2 priority labels or the older branch's name. A completed local check
does not establish production readiness.

## 1. Verify the inherited Phase 1 branch

- Switched from the old `main` checkout to `phase-1-reliable-intake` at `94d567a`.
- Type checks, the six original unit suites, and Vite production build passed.
- Wrangler staging deployment dry run passed; no deployment was performed.
- Added explicit test dependencies for the Miniflare/esbuild versions already
  present in the lockfile. The HTTP suite runs in `npm test` and therefore builds.
- All migrations run in ephemeral D1. The upgrade test creates a legacy record
  before migration 0014 and verifies preservation of its payload and backfill.

## 2. Prove reliable intake

The integration suite calls the real Worker handlers with real simulated D1/R2
bindings. Only external delivery and injected R2 outages are mocked. It covers:

- Validation, durable problem and solution submission, evidence manifests.
- Sequential and concurrent idempotent retries.
- Upload outage leaves no innovation; retry after recovery succeeds.
- Email/webhook failure does not lose the case; due jobs recover on retry.
- Password login, throttling, admin review changes, unauthorized admin requests.
- Receipt content excludes the technical brief.
- Skipped notification recovery after configuring the provider.

Fixed: skipped notifications previously discarded their payload and could not
be retried. New skipped jobs retain the delivery data, have no false sent time,
and can be retried by admins. Delivered jobs still clear payloads. Old skipped
jobs whose payload was already erased cannot be reconstructed by this change.
Provider calls now time out and do not log raw provider exceptions.

## 3. Participant access, organizations and ownership

### Participant workflow

- `/account`: verify email using an eight-digit code, create an organization,
  accept invitations, view own records, claim legacy records, and sign out.
- Codes expire after ten minutes, lock after five incorrect attempts, and can
  only be consumed once. Codes never appear in API responses or local logs.
- Opaque sessions are stored as hashes, expire after eight hours, and are
  checked against the participant's disabled state on every request. Logout
  revokes the server session. Participant and staff cookies are separate.
- Active organization owners see organization records; contributors see their
  own records and explicit grants. Membership is never inferred from a company
  name or email domain. Owners invite contributors, grant/revoke individual
  cases, and revoke memberships. Invitations are accepted in the account UI;
  automated invitation email is not included in this batch.
- Signed-in intake requires an active organization and the verified contact
  email. Ownership is committed in the same D1 batch as the submission.
- Anonymous intake remains usable. A verified account can claim an unowned
  record only when its email matches the original contact. Claims do not move
  records already owned by another organization.
- Participant list/detail/export/file endpoints apply ownership checks and
  exclude internal notes, scores, priority and economics. Downloads recheck
  access on every request and use attachment/octet-stream/nosniff headers.
- Participant record access and organization operations enter the audit trail.

Email verification proves control of a mailbox, **not** that the person legally
represents an organization or that a provider is commercially verified.

### Staff workflow

- Admin case pages have assignment, reviewer-brief and reviewer-file controls.
- Mediators and reviewers receive an assigned-case workspace. Unassigned cases
  are hidden from lists and denied on direct requests.
- Reviewers get an explicitly approved technical brief, not an unreliable
  automatic redaction of raw free text. Evidence is denied until approved for
  reviewers. Approval is human responsibility; it is not malware scanning.
- Existing signed file links stop working after assignment or file approval
  revocation, even before the signature expires.
- The old global matching, development, commercial and publication routes are
  admin-only until their case-scoped policies are implemented. This is a
  deliberate restriction, not a claim that the full mediator workspace is done.
- Admin and participant mutations reject missing/cross-origin Origin headers.
  Programmatic clients must send the same origin as the API host.

### Migration / rollout

- New append-only migration: `0014_participant_access.sql`.
- Existing cases are backfilled as unowned; staff assignments start empty.
  Admins must assign existing cases and approve reviewer briefs/files.
- Apply migrations before deploying the matching Worker code.
- Participant email sign-in requires `RESEND_API_KEY`, verified `ACK_FROM`,
  `SESSION_SECRET`, and `IP_SALT`. No new paid service was provisioned.
- `EMAIL_MODE=log` does not bypass mailbox verification. Without a configured
  sender, account login returns a clear 503. Tests use a fake email provider.
- Do not roll back the Worker without considering the older code's global staff
  access. Prefer a forward fix or disable affected access during recovery.

## Verification and limits

- `npm run build`: type checking, six unit suites, HTTP integration suite, Vite,
  and CSP hashing.
- HTTP suite: 93 checks, including company isolation, contributor grants,
  member revocation, mailbox claims, code expiry/reuse/attempt limits, scoped
  staff access, stale signed links, cross-origin rejection and FK integrity.
- Browser smoke check: account page renders with labeled email input and
  verification action. Authenticated multi-screen browser journeys remain to
  be exercised against staging with a configured email sender.
- No real email was sent, no live database migrated, no Worker deployed, and
  existing `.wrangler` local data was not modified by the HTTP tests.
- File quarantine/scanning, managed staff MFA configuration, recovery drills,
  full CI/monitoring, server drafts, and the complete participant/mediator
  workflow are **not** complete in this batch.
- Claude matching remains unchanged. Free-model integration and automatic AI
  assessments are later work packages.

## Next three steps

4. Operational safeguards: staging inventory, managed staff access, file
   quarantine/scanning, CI, monitoring, backup and restore verification.
5. Full participant/mediator workflow: server drafts, clarification requests
   and responses, next actions, and appropriately scoped operational screens.
6. Structured qualification: values with units, evidence/source/date,
   verification state, constraints, attributable costs and success criteria.

Stop for a checkpoint after these three steps before moving to adaptive intake,
automatic assessments, and free-model matching.
