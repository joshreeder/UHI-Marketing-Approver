# Approval Hub — Project Plan
*Marketing proof & approval tracker for United Heritage Insurance (Meridian/Boise, ID)*
*Draft v1 — Sept 2, 2026*

---

## 1. What it is

A small internal web app where the marketing manager and her designers create projects, upload versions of marketing pieces (PDF, JPEG/PNG, Word, or a drafted email), send them to one or more approvers, and track approvals and change requests per version. Approvers never create accounts — they click a link in an email and are signed in automatically.

**One-sentence pitch:** "Every marketing piece has one home, one current version, and a clear yes/no from everyone who needs to sign off."

---

## 2. Who uses it

| Role | Who | What they can do |
|---|---|---|
| **Owner** | Marketing manager | Everything: create projects, upload, assign approvers, nudge, close, manage settings |
| **Designer** | Her designers (1–3 people) | Create projects, upload new versions, see all feedback, mark change requests addressed |
| **Approver** | Anyone with an email (execs, compliance, agents) | Open the link, preview the file, Approve or Request Changes with comments |
| **Viewer** *(optional, later)* | Anyone CC'd | Read-only |

Owner and Designer are "team members" (invited by email, listed in Settings). Approvers are created automatically the first time their email is added to an item.

---

## 3. Core concepts (the data model in plain English)

```
Project
 ├─ name, description, status, start date, due date, estimated hours, assigned designer
 └─ Items  (one project usually has 1 item, but can have several — e.g. a flyer + an email)
     ├─ title, type (file | email), review window (days)
     └─ Versions  (v1, v2, v3 … newest on top)
         ├─ file (blob URL, mime, size) OR email draft (subject, from-name, HTML body)
         ├─ uploaded by, uploaded at, version note ("fixed logo size")
         └─ Review Round  (exactly one per version)
             ├─ due date (uploaded at + review window)
             ├─ status: pending | changes requested | approved | superseded
             ├─ Approver assignments  (one per email)
             │    ├─ status: waiting | approved | changes requested
             │    ├─ decided at, last emailed at, reminder count
             │    └─ Comments / change requests (text, optional page/area reference)
             └─ Activity log (sent, viewed, approved, nudged, superseded …)
```

**Key rules**
- Uploading a new version **supersedes** the previous review round. Old rounds stay in history, marked *superseded*. Approvers on the previous round are copied to the new round and re-emailed.
- A version is **Approved** when every approver on its round has approved.
- Any single "Request changes" flips the round to *Changes requested*. Approvers can still weigh in, but the designer knows a new version is needed.
- A project can exist with **zero items** (just a name, description, dates) — that's the "project tracker" use case.
- Project status is derived: *Not started → In progress → In review → Changes requested → Approved → Done*. Owner can also set it manually (e.g. On hold, Cancelled).

---

## 4. Main workflows

### 4.1 Create a project
Owner or designer: name, description, start/due dates, estimated hours, designer. Optionally upload v1 right away. Projects show up on the Dashboard and Gantt immediately.

### 4.2 Upload a version
Drag-and-drop or pick a file. Add a short version note. Supported: PDF, JPG/PNG/GIF/WebP, DOCX, PPTX (optional), or compose an **Email** (subject + rich text body). Files go to blob storage; a preview is generated (see §6).

### 4.3 Send for approval
Add one or more approver emails (autocomplete from past approvers). Set review window (default 3 business days, configurable per item). Optional personal note. Click **Send** → each approver gets an email with a magic link.

### 4.4 Approver experience (no login)
1. Email: "Sarah needs your approval on *Fall Auto Mailer*. Due Friday Sept 5." → **Review now** button.
2. Link opens the item page, already signed in. They see the preview, the version note, who else is reviewing, and two buttons: **Approve** / **Request changes**.
3. Request changes opens a comment box (required). They can add several comments. Optional: click on the preview to drop a numbered pin (nice-to-have, Phase 2).
4. Confirmation screen + email receipt. Owner/designer are notified.

### 4.5 Designer responds
Designer sees change requests, uploads v2 with a note ("Addressed all 3 comments"). Round restarts; approvers re-emailed with "New version ready — v2". Old comments are visible under v1 in history and can be marked *Addressed* on v2.

### 4.6 Reminders & the "Nudge" button
- Automatic reminder at 50% of the review window and again at the due date (configurable in Settings; can be turned off).
- **Nudge** button on any pending approver → sends a reminder now, logs it, shows "Nudged 2× · last 2 h ago". Rate-limited to once per hour per approver so nobody gets spammed.
- Overdue rounds show a red "Overdue by 2 days" badge on Dashboard and Gantt.

### 4.7 History
Item page shows versions newest-first. Each version collapses to a single row: *v3 · Sept 2 · Approved 3/3*. Expand to see approvers, decisions, comments, and the activity log. Full audit trail: who viewed when, who approved when, who was nudged.

### 4.8 Planned review rounds on the timeline
When creating a project the owner sets three planning numbers (defaults in Settings):
- **Planned review rounds** (default 3)
- **Review window** — days approvers get per round (default 3)
- **Revision time** — days the designer needs between rounds (default 2)

The app builds the schedule automatically from the start date:
`Design → Review 1 → Revise → Review 2 → Revise → Review 3 → Approved`
and shows it on the Gantt as alternating review/revision segments. It also computes the **latest safe start** for design work given the due date, and warns ("Only 2 rounds fit before Sept 19") when the math doesn't work.

As real rounds happen, actual segments overlay the plan: an approver who takes 5 days instead of 3 pushes everything right, and the project shows "1 day behind plan." Extra rounds beyond the plan are flagged so she can see which projects chronically need more than expected.

### 4.9 Done / archive
When the round is approved, owner clicks **Mark complete** (or it auto-completes if setting is on). Completed projects move off the default dashboard into Archive but stay searchable.

---

## 5. Screens

1. **Dashboard** — cards or table of active projects: status pill, due date, progress (2/3 approved), last activity, overdue flags. Filters: Mine / All / Overdue / In review.
2. **Timeline (Gantt)** — projects as bars from start→due, colored by status; review rounds as a thinner sub-bar with their due date; today marker; drag to adjust dates (Phase 2).
3. **Project page** — header (name, description, dates, hours, designer, status), items list, activity feed.
4. **Item / Version page** — big preview left, action panel right (approvers, status, buttons, comments). Version history below. *This is the page approvers land on.*
5. **New project / Upload version** — simple forms, drag-and-drop.
6. **Email composer** — subject, from-name, rich text editor, "Send me a test" button, then Send for approval like any other version.
7. **Settings** — team members, default review window, reminder schedule, logo/colors, notification prefs.
8. **Sign-in** — single email field → "Check your email for a link."

---

## 6. Technical plan

### 6.1 Recommended stack
Chosen for "simple to host, cheap, and Claude Code can build and deploy it end-to-end."

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One codebase for UI + API routes + cron; first-class on Vercel |
| UI | **Tailwind + shadcn/ui** | Fast, clean, easy to theme to brand colors |
| Hosting | **Vercel** (Hobby tier is fine to start; Pro if you need more cron/bandwidth) | Zero-ops, git-push deploys. Your Vercel account is already connected in this Claude workspace, so we can deploy straight from here. |
| Database | **Postgres via Neon** (or Vercel Postgres) with **Drizzle ORM** | Serverless-friendly, free tier, easy migrations |
| File storage | **Vercel Blob** (S3-compatible alternative: Cloudflare R2) | Signed URLs, simple SDK, private by default |
| Email | **Resend** (React Email for templates) | Great DX, free tier ~3k emails/mo, webhooks for delivered/opened |
| Auth | **Custom magic links** (or Auth.js Email provider) | Email-only, no passwords. Details in 6.2 |
| Previews | PDF: browser-native/PDF.js · Images: native · DOCX: convert to PDF at upload | See 6.3 |
| Scheduled jobs | **Vercel Cron** hitting `/api/cron/reminders` daily/hourly | Reminders, overdue flags |
| Background work | Inline for MVP; Inngest or Trigger.dev later if conversions get slow | |
| Gantt | **frappe-gantt** or a hand-rolled SVG timeline with `date-fns` | Light and good enough |
| AI proofreading (later) | **Claude API** — extract text (PDF/DOCX/email HTML) → return structured comments | Drops into the existing comments model |

**Hosting note:** Claude Code doesn't host apps itself, but it can scaffold the repo, push to GitHub, create the Vercel project, set env vars, and deploy — the whole loop. Domain: something like `approvals.americanheritageins.com` (CNAME to Vercel) or a Vercel subdomain to start.

### 6.2 Passwordless auth (magic links)
- **Team sign-in:** enter email → we email a one-time link (`/auth/verify?token=…`), valid 15 min, single use. On click we set a session cookie (30 days, httpOnly, secure).
- **Approver links:** the approval email contains a link with a **scoped token** tied to *that approver + that item*. Clicking it signs them in as that approver (session cookie) and drops them on the item page. Token valid until the round is superseded or 30 days, whichever first; reusable so they can come back from the same email. If it's expired, the page says "Link expired — enter your email and we'll send a fresh one."
- Approver sessions can only see items they've been assigned to. Team sessions see everything.
- Every action records the email + session, so the audit log is trustworthy.
- Optional hardening later: restrict team sign-in to `@americanheritageins.com`, add Google SSO.

### 6.3 File handling & previews
- Upload directly from browser to Blob via a short-lived upload URL (keeps big files off the server). Max 50 MB to start.
- **PDF** → PDF.js viewer in-page (page thumbnails, zoom).
- **Images** → native `<img>` with zoom/pan.
- **DOCX / PPTX** → convert to PDF on upload (LibreOffice in a small serverless container, or a hosted API like CloudConvert/Gotenberg). Store both; preview the PDF, offer the original for download. Fallback for MVP: render DOCX to HTML with `mammoth` (loses some formatting but zero infrastructure).
- **Email drafts** → stored as HTML; previewed in a sandboxed iframe at desktop and mobile widths; "Send me a test" delivers via Resend to the current user.
- Virus/malware: rely on Blob + browser sandboxing for internal use; add ClamAV scan later if external uploads are ever allowed.

### 6.4 Database schema (tables)
```
users            id, email, name, role (owner|designer|approver), created_at
sessions         id, user_id, token_hash, expires_at, scope_item_id (nullable)
magic_links      id, email, token_hash, purpose, item_id?, expires_at, used_at
projects         id, name, description, status, start_date, due_date, est_hours,
                 planned_rounds, review_window_days, revision_days,
                 designer_id, created_by, created_at, archived_at
items            id, project_id, title, type (file|email), review_window_days, created_at
versions         id, item_id, number, note, uploaded_by, created_at,
                 file_url, file_name, mime, size, preview_url,
                 email_subject, email_from_name, email_html
review_rounds    id, version_id, status, due_at, sent_at, completed_at
approvals        id, round_id, user_id, status, decided_at, last_emailed_at,
                 reminder_count, token_hash
comments         id, approval_id, version_id, body, page_no?, x?, y?,
                 addressed_in_version_id?, created_at
activity         id, project_id, item_id?, version_id?, actor_id, type, meta_json, created_at
settings         key, value_json   (review window default, reminder schedule, branding)
```

### 6.5 Email templates (Resend + React Email)
1. **Approval request** — piece name, thumbnail, requester, due date, note, *Review now*.
2. **New version** — "v2 is ready, here's what changed", *Review now*.
3. **Reminder / Nudge** — friendly, shows due date, *Review now*.
4. **Decision notification** (to owner/designer) — "Bob approved" / "Bob requested changes: …".
5. **All approved** — celebratory summary to owner/designer.
6. **Sign-in link** (team).
7. **Test send** (email drafts).

All emails: plain-text fallback, branded header with logo, reply-to set to the requester so replies go to a human.

### 6.6 Security & privacy basics
- Signed, expiring blob URLs; nothing publicly listable.
- Tokens stored hashed; rate-limit magic-link requests per email.
- Approvers scoped to their items only.
- Daily DB backups (Neon has point-in-time restore).
- Audit log is append-only.

---

## 7. Phased build

### Phase 1 — MVP (target ~3–4 focused build sessions)
- Repo, Next.js scaffold, Neon DB, Vercel Blob, Resend, deploy pipeline
- Magic-link auth for team + scoped approver links
- Projects CRUD with dates/hours/designer
- Items + versions (PDF & image upload), version history newest-first
- Send for approval, approve / request changes with comments
- Approval-request, new-version, decision emails
- Dashboard with status + overdue badges
- Nudge button + daily reminder cron
- Basic Settings (team members, default review window, logo)

### Phase 2 — Polish
- Gantt timeline view
- DOCX/PPTX → PDF conversion
- Email composer + test send
- Pin comments on the preview (click to drop a numbered marker)
- Mark comments "Addressed", autocomplete approvers, archive/search
- Email open/click tracking via Resend webhooks ("Viewed Tue 2:14 pm")

### Phase 3 — Smart
- **AI proofreading**: on upload, Claude reviews text for typos, brand/tone, compliance red flags, broken dates/phone numbers → posts suggestions as a special "AI reviewer" comment set the designer can accept/dismiss
- Approval templates (e.g. "Compliance + CEO" group)
- Weekly digest email to the owner
- Slack/Teams notifications
- Simple reporting: avg time-to-approve, approvals per person, designer hours vs estimate

---

## 8. UI/UX direction — three options to choose from

All three share the same layout bones (left nav, dashboard, item page with preview + action rail). They differ in tone.

**A. "Clean Ledger"** — Very close to a Fraction Central-style look: white background, navy primary (insurance-appropriate), slate gray text, one accent color for status (green approved / amber pending / red changes). Dense table dashboard. Fastest to build with shadcn defaults. *Best if you want it done and unremarkable in a good way.*

**B. "Board & Cards"** — Kanban-flavored dashboard (columns: Not started · In progress · In review · Changes requested · Approved). Softer rounded cards, light warm-gray background, brand navy + a burgundy/red accent pulled from the logo. Feels more like a project tool. *Best if your wife thinks visually about workload.*

**C. "Reviewer-first"** — Optimizes the page approvers see: full-bleed preview, floating action bar (Approve / Request changes), minimal chrome, big readable type, works great on a phone. Team-side screens stay simple like A. *Best if the executives' experience matters most — and it usually does, since they're the bottleneck.*

My recommendation: **A for the team screens + C for the approver page.** They combine cleanly and give the most value where the friction actually is.

Next step once you pick: I'll mock up the Dashboard, Item/Approver page, and Gantt in the chosen direction with the real logo and colors.

---

## 9. Open questions

1. **Logo & brand colors** — United Heritage uses the bald-eagle mark; upload the logo file (SVG/PNG) and any brand-color hex codes.
2. **Fraction Central repo** — share the repo URL so I can mirror its structure, lint config, and component library.
3. **Approver identity** — is it okay that anyone with the email link is treated as that approver (standard magic-link trust), or do you want a "confirm your email" step on first open?
4. **DOCX previews** — okay to start with download-only for Word files and add conversion in Phase 2?
5. **Email drafts** — should the app also *send the final approved email* to the real audience, or just get it approved and she sends it from Outlook/Mailchimp? (I'd recommend the latter for MVP.)
6. **Hours tracking** — estimated hours only, or should designers log actual hours too?
7. **Domain** — subdomain of the company site, or a standalone domain?

---

## 10. Accounts, ownership & data privacy

Set everything up under United Heritage-owned accounts from day one so nothing has to be transferred later:

| Service | Owner account | Notes |
|---|---|---|
| GitHub | New org `united-heritage` (free) under a company email; repo `uh-approval-hub` (private) | You (personal) get added as a member. Transferring a repo later is possible but org-first is cleaner. |
| Vercel | New Vercel team owned by a company email | Hobby is personal-only; a team requires Pro (~$20/user/mo). Alternative: start on your Hobby account and use Vercel's "Transfer project" later — it's a one-click move. |
| Neon (Postgres) | Company email | Free tier; supports project transfer between accounts if needed |
| Vercel Blob | Lives with the Vercel project | Moves with the project transfer |
| Resend | Company email; verify sending domain (e.g. `approvals.unitedheritage.com`) | IT will need to add DNS records (SPF/DKIM) |

Simplest path: create the GitHub org and Vercel team with her work email (or an IT-owned shared mailbox), invite yourself, and build there. That way the company owns the code, the data, and the deployments, and you're just a contributor.

**Can Claude create the repo?** Not from this chat — but Claude Code can, once you're signed into the GitHub CLI (`gh auth login`): it will run `gh repo create`, push the scaffold, link Vercel with `vercel link`, and set env vars. You just need to create the GitHub org and Vercel team (a two-minute form each) because those require account ownership.

## 11. Repo & kickoff checklist

- [ ] Create GitHub org + private repo `uh-approval-hub`; create Vercel team
- [ ] `npx create-next-app` with TS, Tailwind, App Router, ESLint
- [ ] Add shadcn/ui, Drizzle, Resend, Vercel Blob SDK, PDF.js, date-fns, zod
- [ ] Neon project + `DATABASE_URL`; Resend API key + verified sending domain; Blob token
- [ ] Vercel project linked to repo; env vars set; preview deploys on PRs
- [ ] `/docs` folder with this plan, schema, and email copy
- [ ] Seed script with a demo project and fake approvers for testing
