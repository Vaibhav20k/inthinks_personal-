# Implementation checkpoint: steps 4–6

13 November 2026. Target: `Vaibhav20k/inthinks_personal-`, branch
`phase-1-reliable-intake` only. No merge or push to `main`. Nothing was
deployed and no live database was migrated.

Each item is marked **code** (in this repository, tested), **verified
externally** (checked against a real account), or **not done**.

## 4. Operational safeguards

| Item | State |
| --- | --- |
| Staging inventory | **Verified externally (read-only).** See `docs/operations-runbook.md` §1: D1 at migration 0013, R2 not enabled, no email secrets, password staff sign-in, worker from 6 Nov. |
| File quarantine | **Code.** Migration 0015. Content sniffing at upload (`worker/file-safety.ts`) refuses mislabelled files, programs, HTML-as-text and empty files. All files, including existing ones, start quarantined; only released files reach participants, mediators or reviewers. Admin release/reject is audited; reject needs a reason and unshares the file from reviewers. |
| Malware scanning | **Not done.** No free in-Worker scanner exists; release is a recorded human inspection. |
| Monitoring | **Code.** Public `/api/health` (liveness only), admin Operations page, cron `inthinks.health` log line, `[observability]` in Wrangler config. External uptime monitor and log alerts **not set up**. |
| Backups / restore | **Verified externally.** `scripts/d1-backup.mjs` exported real staging; `scripts/restore-drill.mjs --migrate` restored it (hash, integrity, foreign keys, 25 table counts) and rehearsed migrations 0014–0017 with no row lost. Restoring into a live Cloudflare database **not rehearsed**. |
| CI | **Code.** `.github/workflows/ci.yml` builds and tests on every push; blocks edited migrations on PRs. First run on GitHub to be checked. |
| Managed staff access (Cloudflare Access + MFA) | **Not done.** External dashboard setup; steps in runbook §3. |

## 5. Full workflows

- **Server drafts** (code): verified participants save drafts to their account
  from either form, continue on another device from My submissions, with
  optimistic versioning (two tabs cannot overwrite each other), 20-draft limit,
  90-day expiry purged by cron. Private to the author; no files in drafts. The
  browser draft remains the working copy.
- **Clarifications** (code): admins and assigned mediators ask questions with an
  optional due date; the case moves to `clarification_requested`; the
  participant answers once in My submissions without seeing who asked; the case
  returns to `under_review` when nothing is open. Withdrawal supported. All
  actions audited. **No email notification yet** (outbox kinds are fixed by
  migration 0013's CHECK constraint; adding one needs a table rebuild).
- **Case owner and next action** (code): admins choose an owner (an admin, or a
  mediator already assigned to the case); owners and mediators set the next
  action and due date. Next actions page for admins; queue in the mediator
  workspace limited to assigned cases.
- **Scoping**: technical reviewers are excluded from workflow and qualification
  routes; they keep the approved brief. Global commercial routes remain
  admin-only.

## 6. Structured qualification

Migration 0017, `worker/qualification.ts`, shared editor in staff and
participant screens.

- Categories: measurement, constraint (min/max/range/exact), attributable cost
  (amount, currency, period, % attributable), success criterion (baseline,
  target, direction, target date).
- Units from a fixed catalogue mapped to physical dimensions; free-text units
  are refused so later economics can compare like with like.
- Every item has a source type, optional detail, optional linked file from the
  same case, and observation date (not in the future).
- Verification states: unverified, confirmed by submitter, checked against
  document (requires a linked file), independently verified, disputed
  (requires a reason). Any edit resets verification. Items are retired, not
  deleted.
- Participants add and see only their own statements; staff estimates and
  verification notes stay internal. Completeness summary (staff) lists what is
  still missing before numerical assessment.

## Verification

- `npm run build`: type checks, six unit suites, **179** HTTP integration
  checks (93 before this batch), Vite build, CSP hashing.
- New checks cover upload sniffing, quarantine on every download path, release
  rules, health endpoints and their access, owner/next-action rules, mediator
  scoping, clarification lifecycle and isolation, draft privacy/versioning/
  expiry, unit/date/range/cost validation, verification rules, participant vs
  staff visibility and audit entries.
- Browser check on an isolated local database: Operations page, case workflow
  save, clarification, qualification figure entry, Next actions page.
  Participant screens were **not** exercised in a browser (email sign-in needs
  a real sender); they are covered by the HTTP suite and type checks only.
- Staging deploy dry run passed. No deployment, no live migration.

## Rollout

Apply 0014–0017 before deploying this Worker (runbook §2). After 0015 every
existing file is quarantined: administrators must release files before
participants, mediators or reviewers can open them again.

## Next three steps

7. Adaptive text intake: follow-up questions generated from missing
   qualification fields and sector templates, without sending confidential text
   to third-party model APIs.
8. Private automatic admin assessments and deterministic, configurable
   economics computed from verified qualification items.
9. Matching without Claude: rules plus a self-hostable or free model kept off
   confidential records unless approved, with explainable evidence and human
   approval.
