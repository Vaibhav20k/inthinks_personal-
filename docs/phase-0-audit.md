# Phase 0 — Repository audit and product rules

Status: **DRAFT for sign-off** · 6 November 2026 · basis: `main` @ 7ccf978, plan v1.1 (5 Nov 2026)

Confidence tags: **[Certain]** verified in code or by running it · **[Likely]** strong
inference or official docs · **[Unverified]** not confirmed — needs a check.

Nothing in this document is implemented yet. Sections 4 and 5 are proposals that
become backend rules and test cases once approved.

---

## 1. Headline findings

1. **The backend already exists.** [Certain] Cloudflare Worker + D1 + R2, staff auth,
   4 staff roles, audit log, AI match engine, R&D log, opportunities, deals, royalties,
   public profiles — 12 migrations. The live site says "not configured" only because the
   D1/R2 bindings are commented out in `wrangler.toml`. Locally, with bindings on,
   a submission saves and returns `CH-2026-0001`.
2. **There are no participant accounts.** [Certain] Submitters are anonymous; they
   cannot see status, answer clarifications or withdraw. No organizations, memberships
   or access grants exist. This is the largest gap against the plan (P0 §2–4).
3. **Submissions are not safe to retry.** [Certain] No idempotency key; the record is
   committed before files upload (`worker/index.ts:262-278`), so a failed upload returns
   500 while the case exists, and a retry duplicates it. Reproduced locally:
   identical POST twice → `CH-2026-0001` and `CH-2026-0002`.
4. **Staff can see everything.** [Certain] Every role reads every case; `reviewer` and
   `owner` are free-text labels, not access rules. The rnd-reviewer role leaks some
   identity and commercial data (section 3).
5. **The database enforces nothing.** [Certain] No foreign keys, no CHECK constraints,
   no transactions/`db.batch()` anywhere. Every rule lives in worker code.
6. **Production login may break on Cloudflare.** [Unverified] Password hashing uses
   PBKDF2 at 210,000 iterations (`worker/auth.ts:98`). Community sources report
   Cloudflare caps PBKDF2 at 100,000 in production; locally (workerd) login works.
   It also costs ~31–47 ms CPU (measured in Node) against the free plan's 10 ms/request.
   **Recommendation: staff sign in through Cloudflare Access (free ≤ 50 users, MFA)
   and password login is disabled in production.**

---

## 2. Infrastructure inventory and free-tier ceilings

| Service | Used for | Free-tier limit | Source / confidence |
|---|---|---|---|
| Workers | Site + API | 100,000 requests/day, **10 ms CPU/request**, 128 MB, 50 subrequests | Cloudflare docs [Likely] |
| D1 | Records | 5 GB total, 5 M rows read/day, 100,000 rows written/day, Time Travel 7 days; queries fail when exceeded | Cloudflare docs [Likely] |
| R2 | Evidence files | 10 GB storage, free egress | [Likely] |
| Queues | Background jobs | Available on Free since Feb 2026; 24 h retention | Cloudflare changelog [Likely] |
| Cron Triggers | Outbox retry, retention jobs | Free | [Likely] |
| Workers AI | Adaptive intake, drafts | 10,000 neurons/day, shared across models | Cloudflare docs [Likely] |
| Access (Zero Trust) | Staff SSO + MFA | Free ≤ 50 users | [Likely] |
| Turnstile | Bot protection | Free | [Likely] |
| Resend | Acknowledgement email | ~100/day, ~3,000/month | [Unverified] — check pricing page |
| GitHub Actions | CI | Free minutes (private repo quota applies) | [Likely] |

**Not configured today** [Certain]: production D1 database, R2 bucket, secrets
(`SESSION_SECRET`, `IP_SALT`, `ANTHROPIC_API_KEY`), Access application, staging
environment, CI, monitoring. Custom domains `inthinks.com` / `www` are on.

**Owner of the Cloudflare account and `inthinks.com` zone: unknown** — decision D1.

Design consequences of the free tier:
- Keep per-request CPU low: no password hashing, no large JSON transforms in the Worker.
- Outbox = D1 table + Cron Trigger (or Queues); notifications retried, never inline.
- Workers AI budget (10k neurons/day) is the first ceiling AI intake will hit — every AI
  call must degrade to manual review when the budget is exhausted.
- Anthropic match engine stays **off** (no key) until budget exists; matching is human.

---

## 3. Security findings

Ranked. File references are at `main` @ 7ccf978.

| # | Sev | Location | Finding | Planned fix (phase) |
|---|---|---|---|---|
| S1 | High | `worker/admin.ts:147`, `worker/index.ts:369` | No rate limit or lockout on admin login; each attempt costs 210k PBKDF2 rounds (also a CPU-exhaustion vector) | Access-only in prod; throttle per IP + email if passwords remain (P1) |
| S2 | High | `worker/auth.ts:278-291` | No MFA on password accounts; password path may bypass Access MFA if both are enabled [Unverified] | Access with MFA required for every staff account (P1/P2) |
| S3 | Medium | `worker/admin.ts:121-125` | Reviewer strip-list omits `owner`, `patentOwner`, `patentNumber` — reviewer sees who owns the IP [Certain] | Switch to an allow-list per role (P2) |
| S4 | Medium | `worker/auth.ts:65`, `worker/admin.ts:345` | Every role can download evidence; reviewers see file names | Capability + assignment check (P2) |
| S5 | Medium | `worker/admin.ts:1066-1185` | Reviewer reads opportunity pipeline: owner, next action, BD notes, closed reason | Gate on commercial capability (P2) |
| S6 | Medium | `worker/admin.ts:519` | `PATCH /challenges/:ref` has no capability check | Require review capability (P2) |
| S7 | Medium | `worker/admin.ts:535` | `POST /notes/:ref` ungated and does not check the reference exists or its type | Validate target + capability (P2) |
| S8 | Medium | `worker/index.ts:262-278` | Duplicate cases and partial evidence on failure [Certain] | Idempotency key + upload-then-commit (P1) |
| S9 | Medium | `worker/admin.ts:713-730` | Dev-log upload has no file-type allow-list; oversize files silently skipped | Reuse intake allow-list + magic-byte check, reject loudly (P2) |
| S10 | Medium | `worker/match-engine.ts:87-112`, `worker/matches.ts:116` | Raw submission text interpolated into the prompt unescaped; unreviewed submissions sent to the model; names/companies in free text reach the provider | Escape, mark as untrusted data, only qualified records (P5) |
| S11 | Low | `worker/admin.ts:200` | Logout does not revoke the session server-side | Bump `token_version` on logout (P2) |
| S12 | Low | `worker/index.ts:268`, `worker/admin.ts:225` | Client-supplied content-type stored and served; no `nosniff` on downloads | Serve `application/octet-stream` + `nosniff` (P2) |
| S13 | Low | `worker/audit.ts:22` | IP hash is unsalted SHA-256 truncated — reversible for IPv4 | HMAC with `IP_SALT` (P1) |
| S14 | Low | `worker/audit.ts:40` | Audit writes fail open | Alert on failure; fail closed on sensitive reads (P3) |
| S15 | Low | `worker/index.ts:90` | Hard-coded `IP_SALT` fallback | Refuse to run without the secret (P1) |
| S16 | Low | `worker/evidence.ts:13` | Download signing reuses `SESSION_SECRET` | Separate `EVIDENCE_SECRET` (P2) |
| S17 | Low | `worker/index.ts:212-215` | `formData()` buffers before size check when content-length is missing | Require content-length on uploads (P1) |

What is already good [Certain]: deny-by-default admin; HttpOnly/Secure/SameSite=Strict
8 h sessions with role re-read per request; parameterised SQL everywhere; no
`dangerouslySetInnerHTML`; no secrets in `src/`; signed 5-minute download links checked
against the session; audit log has no update/delete route; R2 keys never derived from
user filenames; server-side schema validation drops unknown keys.

Not verified: Access policy coverage, HSTS at the edge, secrets in git history, D1
console access controls.

---

## 4. Roles × records × actions (proposal for sign-off)

### 4.1 Roles

| Plan role | Today | Proposal |
|---|---|---|
| Platform administrator | `super-admin`, `admin` | Keep. Only role that manages users, rules, exports. |
| Assigned mediator | `business-development` (global) | Rename to `mediator`; access only to **assigned** cases + logged break-glass. |
| Technical reviewer | `rnd-reviewer` (global) | Keep; access only to assigned cases; never identity or commercial fields. |
| Organization owner | — | New external role: manages members and all of the org's records. |
| Contributor (industry rep / innovator) | — | New external role: their own submissions + records the owner shares. |

An organization can hold both problems and technologies. Participation in a shared
engagement never exposes the rest of an organization's account.

### 4.2 Matrix

`●` allowed · `A` only on assigned cases · `O` own organization's records · `S` only
what has been explicitly shared/disclosed to them · `—` never.

| Record → / action ↓ | Problem / Technology | Evidence files | Clarifications | Internal notes | Admin assessment (scale, priority, economics) | Match / shortlist | Engagement / deal / royalty | Public profile | Audit log | Users / members |
|---|---|---|---|---|---|---|---|---|---|---|
| **Submit / create** | Owner O, Contributor O | Owner O, Contrib O, Staff A | Mediator A, Admin ● | Staff A | system (AI draft) | Mediator A, Admin ● | Mediator A, Admin ● | Admin ● | system | Admin ●, Owner O (members) |
| **Read** | Owner O, Contrib O, Mediator A, Reviewer A (no identity), Admin ●; counterparty S | Same as record; Reviewer A | Participant O, Staff A | Staff A | Mediator A, Admin ● — **never participants, never reviewers** | Staff A (reviewer: no commercial fields); participant S | Mediator A, Admin ●; participant S (own terms) | everyone | Admin ● | Admin ●, Owner O |
| **Edit** | Owner/Contrib O until qualified, then via clarification; Staff A (structured brief only) | Uploader until reviewed | Author | Author | Mediator A, Admin ● (override + reason) | Mediator A, Admin ● | Mediator A, Admin ● | Admin ● | — | Admin ●, Owner O |
| **Review / decide** | Mediator A, Reviewer A (technical), Admin ● | Reviewer A | Mediator A | — | Admin ● approves | Mediator A proposes, Admin ● approves | Admin ● | Admin ● | — | — |
| **Share / disclose** | Mediator A proposes, Admin ● approves (per level, per version) | same | — | — | — | Admin ● | Admin ● | — | — | — |
| **Publish** | Admin ● only, from an approved publication record; submitter opt-in required | — | — | — | — | Admin ● (anonymised) | — | Admin ● | — | — |
| **Withdraw** | Owner O, Contributor O (own) | Owner O | — | — | — | Participant O (declines) | — | Admin ● (unpublish) | — | Owner O (leave) |
| **Archive** | Admin ● | Admin ● | Admin ● | — | Admin ● | Admin ● | Admin ● | Admin ● | — | Admin ● (disable) |
| **Export** | Admin ●, Owner O (own data) | Admin ●, Owner O | Admin ● | Admin ● | Admin ● only | Admin ● | Admin ● | — | Admin ● | Admin ● |
| **Delete (hard)** | Retention job / Admin ● on verified request only | same | same | same | same | same | legal hold applies | Admin ● | **never** | Admin ● |

Every cell above becomes a server-side check and at least one test. Hiding a tab in the
UI is not a control.

### 4.3 Mandatory negative tests (Phase 2 gate)

A user from Company A must get 403/404 — never data — for Company B's records via:
changing an id in the URL, list/search endpoints, export, an evidence download link,
a notification email link, and an AI-generated summary. A reviewer must never receive
identity or commercial fields from any endpoint.

---

## 5. Data classification (APPROVED 2026-11-06)

| Class | Meaning | Examples | Storage / handling |
|---|---|---|---|
| **C0 Public** | Approved for the website | Published technology/problem/match profiles | Read only from publication records (`*_profiles`, `published = 1`); never from raw submissions |
| **C1 Internal** | Staff operational data, not sensitive | Status, stage, assigned owner, due dates | Staff only |
| **C2 Restricted evaluation** | Shared with approved participants under a disclosure decision | Structured brief, selected specs, anonymised evidence | Explicit grant per record + version |
| **C3 Confidential technical** | Raw disclosures and evidence | Problem statement, technical answers, files, IP details, patent numbers | Assigned staff + owning org; grant under agreement; never to AI providers that train on input |
| **C4 Admin-only commercial** | InThinks' commercial view | Assessment scores, hot/not-hot, economics, win probability, deal terms, royalty rates, negotiation notes | Platform admin + assigned mediator only; excluded from participant APIs, emails, exports to participants, logs, caches |
| **PII tag** | Personal data, any class | Names, emails, phones, LinkedIn, institution, team members, IP owner | Stripped for reviewers; never logged; never sent to AI; deletion on request |

### 5.1 Two-sided anonymity (DECIDED 2026-11-06)

- Problem statements can be read by solution providers; the **identity of the company
  or person who submitted the problem is never shown** to them.
- Solution providers are equally **anonymous to problem owners**.
- Identity = PII tag + organization name + anything in the text that identifies them
  (site names, asset names, locations, brand names, people). A statement is only shown
  to providers after an anonymised version is produced and approved — the raw text
  stays C3. Removing the company field alone is not enough.
- **D9:** full anonymised statements are readable only by signed-in, verified solution
  providers; the public site shows a short teaser.
- **D10 (FIRM RULE — not to be changed):** identities are **never revealed** to the
  other side, and the two sides never meet, at any stage including pilots and deals. Consequence: InThinks must be the contracting party with each side
  (back-to-back agreements) for pilots, licensing and transfer; site visits, installation
  and IP assignment need a legal answer (D6).
- **D11:** submitters can mark individual fields "InThinks only"; those fields never
  reach providers, even anonymised.

Rules: logs carry references and shapes, never content. Notification emails carry the
reference and a neutral status only. Browser drafts must be user-clearable (C3 data
sits in `localStorage` today — `src/lib/draft.ts`).

---

## 6. Gap map against the plan

| Plan item | Status | Evidence / note |
|---|---|---|
| Organizations + membership | MISSING | company is free text on `challenges` |
| Problem / technology **versions** | MISSING | `payload` overwritten in place |
| Claim + evidence verification | MISSING | `evidence` is a file manifest only |
| Match assessment with eligibility, open questions | PARTIAL | `matches` (0003, 0012); open questions only on public `match_profiles` |
| Engagement (participants, responsibilities, next action) | PARTIAL | `opportunities` has owner/next_action; no participants |
| Engagement type (scouting, development, licensing, pilot) | PARTIAL | only `deals.deal_type`; no scouting/mediation |
| Access grants | MISSING | role-only access |
| Audit events | EXISTS | `audit_log`; list views not logged; failed logins not logged |
| Submission lifecycle (draft, clarification, withdrawn) | MISSING | challenges start `Received`, innovations `Submitted`; no submitter route |
| Idempotent submission | MISSING | reproduced |
| Acknowledgement email | MISSING | only `NOTIFY_WEBHOOK` (reference, company, sector) |
| Server drafts / "remove from device" | MISSING | `localStorage` only; cleared only after submit |
| Separate state machines | PARTIAL | `challenges.status` mixes review with pipeline values; `innovations.status` mixes review with commercial |
| Value + unit + source + date + verification; "not known" ≠ 0 | MISSING | technical values are free-text strings |
| Illustrative vs operational data | EXISTS (public) | `record_type` demo/live on profiles; `src/data/examples.ts` shown only when API is empty |
| Retention / deletion / export | MISSING | no deletion route, no scheduled handler |
| DB integrity | MISSING | no FKs, no CHECKs, no transactions |

---

## 7. Refactor prerequisite: split `worker/admin.ts`

2,990 lines; project rule is < 500 per file. Split by route group before adding
features to it (start of Phase 2), no behaviour change, tests unchanged:

| New module | Lines today | Content |
|---|---|---|
| `admin/router.ts` + `admin/http.ts` | 1–62, 186–270 | helpers, dispatch, config/login/logout/evidence/me/meta |
| `admin/serialize.ts` | 63–144 | serializers + redaction (becomes the per-role allow-list, S3) |
| `admin/login.ts` | 145–185 | login |
| `admin/intake.ts` | 271–548 | overview, innovations, messages, challenges, notes |
| `admin/development.ts` | 549–772 | R&D workspace |
| `admin/matches.ts` | 773–1063 | matches |
| `admin/opportunities.ts` | 1064–1224 | pipeline |
| `admin/deals.ts` | 1225–1560 | deals + child rows |
| `admin/royalties.ts` | 1561–1939 | royalties |
| `admin/profiles-*.ts` | 1940–2936 | match / technology / challenge / innovation profiles |
| `admin/audit-users.ts` | 2937–2990 | audit, users |

Note: `src/admin/*` (frontend) also needs a size check; out of scope until Phase 4.

---

## 8. Decisions needed before Phase 1

| # | Decision | Blocks | Default if you agree |
|---|---|---|---|
| D1 | Who owns the Cloudflare account / `inthinks.com` zone, and can we get access (or a separate account for staging)? | Phase 1 go-live | **DECIDED 2026-11-06:** Vaibhav's own free Cloudflare account, for testing/staging. Deploys there use `*.workers.dev`, not the `inthinks.com` routes. Production account/zone still to be settled. |
| D2 | Stay on D1 (SQLite) | All phases | **DECIDED 2026-11-06:** D1 for now (local + staging); revisit at the Phase 2 boundary |
| D3 | Budget | — | **Settled: free tiers only** |
| D4 | Approve the role matrix (section 4) and engagement types | Phase 2 | As written |
| D5 | Impact bands, "hot" rubric, fee rules | Phase 5 | Plan's draft bands; rubric later |
| D6 | Submission terms, NDA template, retention period | Phase 2 | Propose 24 months after closure for declined/withdrawn cases [Guessing — needs legal] |
| D7 | 10–20 anonymised real cases for AI evaluation | Phase 5 | — |
| D8 | Staff sign-in = Cloudflare Access only in production; password login off | Phase 1 | **DECIDED 2026-11-06: yes** (passwords for local testing only) |
| D9 | Who can read anonymised problem statements | Phase 2 | **DECIDED 2026-11-06:** signed-in verified providers; public teaser only |
| D10 | Are identities ever revealed to the other side, and when | Phase 6 | **DECIDED 2026-11-06:** never; InThinks contracts with each side (needs legal check, D6) |
| D11 | Can submitters mark parts of a statement as confidential | Phase 2 | **DECIDED 2026-11-06:** yes, per field ("InThinks only") |

---

## 9. Phase 1 entry checklist

- [ ] D1, D2, D8 decided
- [ ] Role matrix (section 4) and classification (section 5) approved
- [ ] Phase 1 scope fixed: idempotent submission (S8), upload-then-commit, status
      lifecycle, outbox + Cron acknowledgement email, Turnstile, `IP_SALT` hardening
      (S13, S15, S17), staging environment
- [ ] Work happens on a branch in `Vaibhav20k/inthinks_personal-`; nothing pushed to
      the original repository
