# Operations runbook

What keeps InThinks safe to run, and which parts are code in this repository
versus setup that someone must do (and verify) in an external account.
"Configured" in a file never means "working"; each item says how to check.

## 1. Staging inventory (read-only check, 13 November 2026)

Checked with Wrangler against the Cloudflare account that owns staging. Nothing
was changed.

| Item | State found |
| --- | --- |
| Worker `inthinks-staging` | Deployed 6 Nov 2026 from older code (before step 3). |
| D1 `inthinks-staging` | Exists. Migrations 0001–0013 applied; 0014–0017 pending. 22 rows across 25 tables. |
| R2 | Not enabled on the account (API error 10042). Staging uploads are refused. |
| Secrets | `IP_SALT`, `SESSION_SECRET` only. No `RESEND_API_KEY`/`ACK_FROM`: participant email sign-in returns 503 on staging. |
| Staff sign-in | Password sign-in (`PASSWORD_LOGIN=on`). No Cloudflare Access. |
| D1 Time Travel | Available (current bookmark returned). |
| Production | D1/R2 bindings commented out in `wrangler.toml`; not inspected further. |

Re-run: `npx wrangler d1 list`, `npx wrangler d1 migrations list inthinks-staging --remote -c wrangler.staging.toml`,
`npx wrangler secret list -c wrangler.staging.toml`, `npx wrangler r2 bucket list`.

## 2. Rollout order for steps 3–6

1. Back up: `node scripts/d1-backup.mjs --env staging` (section 6).
2. Rehearse: `node scripts/restore-drill.mjs backups/<file>.sql --migrate`.
   Done on 13 Nov 2026 with the real staging export: 0014–0017 applied, no row lost, foreign keys intact.
3. Apply migrations: `npm run db:migrate:staging`.
4. Deploy: `npm run deploy:staging`.
5. Check `/api/health` (expects `{"ok":true}`) and the admin **Operations** page (expects no missing migrations).

Migrations must be applied before the Worker that uses them. Do not roll the
Worker back past step 3 without considering that older code had global staff
access; prefer a forward fix.

## 3. Managed staff access (external, not done)

Production staff sign in through Cloudflare Access (Zero Trust free tier covers
small teams), never passwords.

1. Zero Trust → Access → Applications → self-hosted application for the admin
   hostname path `/admin*` and `/api/admin*`.
2. Policy: allow named staff emails only; require a one-time PIN or identity
   provider with MFA.
3. Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` (secrets or vars) on the Worker.
   Do not set `PASSWORD_LOGIN` in production.
4. Verify: Operations page shows "Managed staff sign-in: configured" and no
   password warning; a non-listed email is refused by Access before reaching
   the Worker; each staff user still needs a row in `users`.

## 4. Files: quarantine and inspection

Code (done): every upload's first bytes must match its extension; programs,
HTML-as-text and empty files are refused; every file is stored quarantined,
including files that existed before migration 0015. Participants, mediators
and reviewers receive only files an administrator has released. Release and
rejection are audited; a rejected file is unshared from reviewers.

Not done: real malware scanning. No free scanner runs inside a Worker. Until a
scanning service is chosen (and approved if paid), administrators inspect
files on a protected machine before releasing them. Office files, PDFs and zip
archives are labelled for closer inspection (macros, embedded content).

## 5. Monitoring

- `GET /api/health` — public liveness, database reachability only. Point a free
  external uptime monitor at it (not yet set up).
- Admin **Operations** page (`GET /api/admin/health`) — missing migrations,
  failed/overdue notifications, files waiting in quarantine, overdue next
  actions and clarifications, unowned cases, and which settings are present.
- Cron (every 5 minutes) logs one `inthinks.health` JSON line with counts only
  when something needs attention. `[observability] enabled = true` keeps these
  in Workers Logs; filtering or alerting there is not yet configured.

## 6. Backups and restore

Two layers:

- **D1 Time Travel** (built in): restores the database to a point in recent
  history. `npx wrangler d1 time-travel info <db>` shows the current bookmark;
  `restore --bookmark=…` OVERWRITES the live database — treat as an incident action.
- **Export files**: `node scripts/d1-backup.mjs --env staging|production`
  writes `backups/<db>-<time>.sql` plus a manifest (row counts, SHA-256).
  Exports contain confidential submissions: keep them encrypted, outside the
  repository (`backups/` is git-ignored), and delete them on schedule.

Restore drill (monthly, and before every migration):
`node scripts/restore-drill.mjs backups/<file>.sql --migrate`. It verifies the
hash, `integrity_check`, foreign keys and per-table row counts, then rehearses
pending migrations. Last run: 13 Nov 2026 on staging, all checks passed.

Restoring a live database from a file means `wrangler d1 execute <db> --remote
--file <dump>` into a new, EMPTY database, then pointing the Worker binding at
it. This has not been rehearsed against Cloudflare.

R2 files are not covered by D1 exports. Once R2 is enabled, bucket backup is a
separate decision (R2 has no built-in versioning on the free tier).

## 7. CI

`.github/workflows/ci.yml` runs `npm ci` and `npm run build` (type checks, unit
suites, HTTP integration suite in isolated Miniflare, Vite build, CSP hashing)
on every push and pull request, without secrets. On pull requests it fails if
an existing migration file was edited or removed. Verify on GitHub → Actions
after the first push; branch protection for `main` is not configured.
