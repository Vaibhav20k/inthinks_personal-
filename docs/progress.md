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
| 8 | Private automatic admin assessments + deterministic economics | ✅ Done |
| 9 | Matching without Claude | ✅ Done |
| 10 | Controlled disclosure and engagement workflow | ✅ Done |
| 11 | Voice, documents, discovery, pilots | ✅ Done |
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

### 8. Private assessments and economics
- **Assessment panel** on every case (admins and the assigned mediator only;
  technical reviewers and participants never see it). Worked out fresh on each
  view from the case's figures; nothing is stored, so it is never stale.
- Problem side: **money at stake per year** (yearly cost × share it causes;
  monthly × 12), **expected yearly saving** (× the improvement needed),
  optional **energy saving** at a set kWh price, **payback per match**
  (solution's one-off cost ÷ saving). Solution side: installation cost and
  payback against each matched problem.
- Every number is a **low–high range**: high = figures as stated, low = each
  figure discounted by how well it is checked (100 / 90 / 70 / 50 %); a
  derived number takes its weakest input. **Disputed figures are left out**
  and the panel says so.
- **Priority: Hot / Warm / Not yet / Not enough data**, with the reasons.
  Points: value at stake 0–2, half the figures checked 1, checklist complete 1,
  strong or promising match 1. Hot needs 4 points and some value.
- **No currency conversion** and **no AI** — plain arithmetic, same inputs
  give the same answer. Only the default currency is ranked by value.
- **Economics settings page** (admins): trust shares, thresholds, default
  currency (EUR), kWh price. Each save is a new version (migration 0021) and
  audited; the panel names the version it used.
- A percentage target with a baseline ("scrap ≤ 2 % from 8 %") is treated as
  an absolute rate and not used as an improvement, rather than guessed at.

### 11. Voice, documents, discovery, pilots
- **Pilots** (migration 0023): on each opportunity, admins add dated steps
  and record measurements against the **problem owner's own success
  criteria**; met / not met follows from the comparator. The problem side
  sees the steps and "2 of 3 criteria met", never the raw values or sources.
- **Discovery** (decision D9): admins verify organizations as solution
  providers and list problems that have an approved anonymised brief. A
  problem shows only when **listed by an admin and agreed by its submitter**
  (new tick box on their account page). Providers read the brief and send
  "We could solve this" to InThinks; neither side learns who the other is.
  New admin page: *Discovery*.
- **Voice**: signed-in submitters can describe a problem by voice (up to two
  minutes). Workers AI Whisper turns it into text they edit before
  submitting; the recording is not kept. 30 per day
  (`AI_VOICE_DAILY_LIMIT`). The site's Permissions-Policy now allows the
  microphone on its own pages only.
- **Documents**: on a case, the submitter can upload a PDF, Word, Excel, CSV
  or text file; Workers AI turns it into text, emails/phones/links are
  blanked, and the figure reader offers the numbers it finds for them to
  confirm. The file is not stored, so this works without R2. Counts against
  the figure reader's 40 runs a day.

### 10. Controlled disclosure and engagement
- **Anonymised briefs** on every case (migration 0022): staff write a title,
  summary and chosen figures; the assigned mediator proposes; only an admin
  approves, after ticking that they read it for site, brand and people names.
  Approved versions are never edited; a new version supersedes the old one.
- **Automatic identity check** on save, on approval and again every time a
  brief is shown: the submitter's company, organization, people, email,
  phone, website, site location, IP owner, patent number and co-inventors,
  plus email/phone/profile-link/web-address shapes and named companies or
  institutions. A brief that fails at show time is withheld, not shown.
- **Costs never go in a brief**, nor do figures the submitter marks
  **"InThinks only"** (new tick box on each figure, both sides).
- **Engagement on each opportunity**: type (scouting, development,
  licensing, pilot) and two sides handled separately. An admin shares the
  other side's approved brief with each side, pinned to that version, sets
  a next step the side can see, and can revoke. Sharing a newer version asks
  the side for a fresh answer.
- **Participants** see *Opportunities shared with you* on their account
  page: the anonymous brief and figures, stage, type and next step, and
  answer InThinks with *Interested*, *I need more information* (with a
  question) or *Not interested*. They never see the other side's identity,
  reference, or any commercial figure (tested).

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

**Test status:** 374 automated HTTP checks + 8 unit suites pass.

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
- [x] Removed the 10 invented example technologies, problems and matches
  (14 Nov 2026). Public pages now show only admin-published records, and an
  empty state until then. The home-page signal animation is hidden until
  published pairs exist.
- [x] Checklists now cover all 11 form sectors (added construction /
  infrastructure, mining, electronics); a unit test keeps them in step with
  the form and checks each problem limit has a comparable solution figure.
  The water list is used only for free-text sectors (no form option).
- [x] Signed-in submitters get their verified email filled in and locked
  on both submission forms (checked in the browser on staging).
- [x] Phase 7 participant form clicked through on staging (14 Nov 2026):
  accept, reject and typed answers all saved correctly; test case removed.
- [x] Suggested numbers show separators (2,400,000).
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
- [ ] Phase 8 starting values (EUR, Hot ≥ 100,000, Warm ≥ 20,000, trust
  100/90/70/50 %) are placeholders; set real ones on the Economics page.
- [ ] Payback only works when the solution states a one-off cost in the same
  currency as the problem's yearly cost.
- [ ] Phase 10 sends no email when an opportunity is shared; the side sees
  it next time they open their account page.
- [ ] Only admins run engagement sharing (mediators write and propose briefs).
- [ ] Voice and document reading were tested with a stand-in AI; check them
  once on staging with a real recording and a real PDF.
- [ ] Discovery sends no email to providers when a problem is listed, or to
  InThinks when interest arrives; check the Discovery page.
- [ ] Documents that are scanned images may read poorly (no text layer).
- [ ] The identity check cannot know every site, brand or person name; the
  admin's manual read before approval is the second check.

### Next phases
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
