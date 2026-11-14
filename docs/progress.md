# InThinks — project progress

Single tracker for the upgrade. Update it at the end of every batch.
Detailed checkpoints: [progress-steps-1-3.md](progress-steps-1-3.md),
[progress-steps-4-6.md](progress-steps-4-6.md). Operations:
[operations-runbook.md](operations-runbook.md).

Branch: `phase-1-reliable-intake` on `Vaibhav20k/inthinks_personal-`. Never
push or merge to `main`. Last updated: 13 November 2026.

---

## 1. All planned phases

| # | Phase | Status |
| --- | --- | --- |
| 1 | Verify the inherited branch (build, tests, staging dry run) | ✅ Done |
| 2 | Reliable intake | ✅ Done |
| 3 | Participant accounts, organizations, ownership, scoped staff access | ✅ Done |
| 4 | Operational safeguards | 🟡 Code done; external setup pending |
| 5 | Full workflows (drafts, clarifications, owners, next actions) | ✅ Done |
| 6 | Structured qualification | ✅ Done |
| 7 | Adaptive text intake | ✅ Done |
| 8 | Private automatic admin assessments + deterministic economics | ⬜ To do |
| 9 | Matching without Claude | ✅ Done |
| 10 | Controlled disclosure and engagement workflow | ⬜ To do |
| 11 | Voice, documents, discovery, pilots | ⬜ To do |
| 12 | Enterprise, scale, visual redesign | ⬜ To do |

---

## 2. Completed phases

### 1. Verify the inherited branch
Type checks, unit suites, production build and staging deploy dry run all
pass. Every migration runs in an isolated test database.

### 2. Reliable intake
- Submissions are saved once even on double-clicks, retries or dropped
  connections (idempotency keys).
- A failed file upload saves nothing, so a retry is clean.
- Email and webhook failures never lose a submission; they retry automatically,
  and admins can retry skipped ones.
- Admin login is throttled.

### 3. Participant access and ownership
- `/account`: email-code sign-in, organizations, invitations, claiming earlier
  submissions, own records, export.
- Companies cannot see each other's cases. Contributors see only their own
  cases or ones explicitly shared.
- Staff (mediators, reviewers) see only cases assigned to them; reviewers get
  an admin-approved anonymized brief and approved files only.

### 4. Operational safeguards (code part)
- Uploaded files are checked against their type; programs and mislabelled
  files are refused. Every file is quarantined until an admin releases it.
- `/api/health` for uptime monitoring; admin **Operations** page; health log
  line every 5 minutes.
- Backup and restore-drill scripts. Real staging backup restored successfully,
  and migrations 0014–0017 rehearsed on it with no data lost.
- GitHub Actions CI runs the full build and tests on every push (passing).

### 5. Full workflows
- Participants save drafts to their account and continue on another device.
- Staff ask clarification questions; participants answer in My submissions;
  case status follows automatically.
- Each case has an owner and a next action with a due date; **Next actions**
  page for admins and mediators.

### 6. Structured qualification
- Figures per case: measurements, limits, attributable costs, success
  criteria — each with a unit from a fixed list, a source and a date.
- Verification states; editing a figure resets its verification; figures are
  retired, never deleted.
- Participants see only their own figures; staff estimates stay internal.

### 7. Adaptive text intake
- **Sector checklists** (`worker/intake-checklist.ts`): the figures that
  matter per sector (manufacturing, energy, water, food, default) for
  problems and solutions. Edit the lists freely.
- **Help us match you better** in My submissions: only the missing figures,
  each with a unit list; answers become the participant's own figures and
  feed phase 9's figure checks.
- **Numbers read from the text** by Cloudflare Workers AI
  (`@cf/zai-org/glm-4.7-flash`, thinking off, ~7 free units per run).
  A suggestion is kept only if its unit fits and its exact quote, number
  included, appears in the submission. Nothing is saved until the
  participant clicks *Yes, that's right*. Capped at 40 runs a day
  (`AI_EXTRACT_DAILY_LIMIT`); text with an email or phone number is never
  sent.
- **Admin Figures checklist** on each case: filled, missing and awaiting
  confirmation, with one-click *Ask as clarification*.
- Checked live on staging: the AI read 180 °C, 2,400,000 kWh/year, 120 h and
  15% correctly from a test problem.

### 9. Matching without Claude
- Claude is no longer used. Default engine: rules → verified figures →
  meaning similarity from **Cloudflare Workers AI** (`@cf/baai/bge-m3`, free
  daily allowance, records stay on the Cloudflare account).
- Keeps the **top 3** suggestions per run. Each one lists its reasons, figure
  conflicts and missing evidence. Labels come from fixed thresholds; there are
  no percentages, and IP is never guessed.
- **Reverse matching:** each technology page has *Find matching problems*.
- **Automatic on submit** (14 Nov 2026): every new problem or solution is
  matched in the background straight after it is saved, so its top 3 are
  already waiting for the admin. It never delays or breaks the submission;
  audited as `system@inthinks`; turn off with `AUTO_MATCH=off`. Checked live
  on staging.
- If the AI is unavailable or the free allowance is spent, matching falls back
  to rules + figures and says so. Text containing an email, phone number or
  LinkedIn link is never sent to the AI.
- Every suggestion starts *Pending*. Only an admin decision moves it, and
  re-running never overwrites a decision.
- Meaning-vectors are stored (migration 0019) and recomputed only when a
  record's text changes.

**Test status:** 247 automated HTTP checks + 6 unit suites pass.

---

## 3. Phases still to do

### Pending from phase 4 (external setup — needs your accounts)
- [x] Apply migrations 0014–0017 to staging, then deploy staging
  (13 Nov 2026: backup + restore drill passed first; live at
  https://inthinks-staging.inthinks.workers.dev, `/api/health` ok).
- [x] Email sender on staging (`RESEND_API_KEY` secret, `ACK_FROM` =
  Resend test sender). Live code sent to vkpal2006@gmail.com.
- [x] **Resend usage cap** at half the free tier: 50/day, 1,500/month
  (migration 0018, `worker/email-quota.ts`). Codes keep 10/day in reserve;
  receipts over the cap wait until the next UTC day. Shown on Operations.
- [x] Free uptime monitor on `/api/health` (UptimeRobot, 5-minute checks,
  email alerts). Added 13 Nov 2026.
- [ ] Choose a real malware scanner (currently manual inspection).
- [ ] Rehearse restoring into a live Cloudflare database.

### Deferred — do later

> [!IMPORTANT]
> **Tomorrow, once the card is available (14 Nov 2026):** enable R2 and
> create the bucket, then set up Cloudflare Access. When Access is on, add a
> bypass for `/api/health`, or the UptimeRobot monitor will report the site
> as down. Steps for both are below.

- [ ] **Enable R2 file storage.** Free up to ~10 GB but Cloudflare needs a card
  on file; no card available yet. Until then staging refuses attachments.
  After enabling: create bucket `inthinks-staging-evidence`, uncomment the R2
  block in `wrangler.staging.toml`, redeploy.
- [ ] **Cloudflare Access (Zero Trust) with MFA.** Free up to 50 users; locks
  `/admin` behind an email allow-list + one-time code. Deferred for now; admin
  stays on password + login throttling. Steps: runbook §3. On staging it gates
  the whole workers.dev site; on production only `/admin` (needs the
  `inthinks.com` zone on this account).
- [ ] **Verify a domain in Resend** so codes reach any address (no domain yet).


### Known gaps in finished phases
- [ ] Phase 7: the participant *Help us match you better* form is covered by
  automated tests but not yet clicked through in a browser (needs a signed-in
  participant with an owned case).
- [x] Phase 9 checked live on staging (14 Nov 2026), engine
  `rules+figures+@cf/baai/bge-m3`. Kiln problem → coating **Strong** (0.76),
  battery film **Weak** (0.45). Reverse: vibration sensor → conveyor problem
  **Promising** (0.78), packaging **Weak** (0.43).
- [ ] Tune the similarity thresholds (0.70 / 0.55) once admins have reviewed
  about 20 real pairs. Unrelated test pairs scored 0.43–0.45.
- [x] TEST P9 records removed from staging (14 Nov 2026, after a backup);
  the audit log keeps its entries.
- [ ] No email when staff ask a clarification question.
- [ ] No automatic invitation email.
- [ ] Participant screens not yet tested in a browser.

### Next phases
- **8. Automatic admin assessments** — private to admins, economics computed
  by fixed, configurable rules from verified figures.
- **10. Controlled disclosure and engagement.**
- **11. Voice, documents, discovery, pilots.**
- **12. Enterprise, scale, visual redesign.**

---

## 4. Highlighted points

> [!IMPORTANT]
> **Email sender (`ACK_FROM`) and Resend's test address**
>
> - Until you verify your own domain in Resend, use their test sender:
>   `ACK_FROM=InThinks <onboarding@resend.dev>`.
> - That sender only delivers to **the email address you signed up to Resend
>   with**. On `/account`, sign in with that same address, or the code never
>   arrives.
> - Once you verify a domain in Resend (Domains → Add domain → add the DNS
>   records it gives you), switch to e.g.
>   `ACK_FROM=InThinks <receipts@yourdomain.com>`. Then codes reach any address.

> [!IMPORTANT]
> **Where secrets go**
>
> - Local: `inthinks/.dev.vars` (git-ignored). Never commit it, never paste
>   keys into chat.
> - Staging/production: `npx wrangler secret put RESEND_API_KEY -c wrangler.staging.toml`.

> [!IMPORTANT]
> **Email cap: 50 a day, 1,500 a month** (half of Resend's free tier). The last
> 10 a day are kept for sign-in codes. Change with `EMAIL_DAILY_LIMIT` /
> `EMAIL_MONTHLY_LIMIT` only if the Resend plan changes.

> [!WARNING]
> **After migration 0015, every existing file is quarantined.** An admin must
> release each file before participants, mediators or reviewers can open it.

> [!WARNING]
> **Migrations before code.** Apply migrations before deploying the Worker that
> uses them. Never edit an applied migration; add a new one.

> [!WARNING]
> **Staging admin uses a test password.** `vkpal2006@gmail.com` is a staging
> super-admin with the test password chosen on 14 Nov 2026. Change it, or turn
> on Cloudflare Access, before any real data goes on staging.

> [!NOTE]
> **Password hashing is capped at 100,000 PBKDF2 rounds.** Live Cloudflare
> Workers refuse more, even though local tests allow it; a higher value broke
> every staging admin sign-in. A test now guards the limit.

> [!WARNING]
> **Cloudflare retires AI models.** `llama-3.1-8b-instruct` was retired on
> 30 May 2026 and silently produced nothing until replaced. If figure
> suggestions stop appearing, check the model in `worker/intake-extract.ts`
> against `npx wrangler ai models list`.

> [!NOTE]
> **"Configured" is not "working".** A setting existing in a file or on the
> Operations page does not prove the service works; check it live.

> [!NOTE]
> **No paid services or Claude API** for testing; free tiers only. Confidential
> records must not be sent to free third-party AI APIs.
