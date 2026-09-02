# Claude Code kickoff — Approval Hub

Paste the block below into Claude Code from an empty folder after you've done the two manual steps.

## Manual steps first (5 minutes)
1. Create the GitHub org (or decide to use your personal account for now) and run `gh auth login`.
2. Create the Vercel team (or use Hobby) and run `vercel login`.
3. Put `approval-hub-plan.md`, `brand-tokens.css`, and `united-heritage-logo.png` in the empty folder.

---

## Prompt to paste

```
You are scaffolding a new internal web app called Approval Hub for United Heritage Insurance.
Read approval-hub-plan.md in this folder first — it is the source of truth. Then build Phase 1.

STACK (mirror the conventions of a typical Next.js-on-Vercel project)
- Next.js 15, App Router, TypeScript strict, Tailwind, shadcn/ui
- Drizzle ORM + Postgres (Neon). Migrations in /drizzle.
- Vercel Blob for files, Resend + React Email for mail, Vercel Cron for reminders
- zod for validation, date-fns for dates, PDF.js (pdfjs-dist) for PDF preview
- No third-party auth library: implement magic links exactly as described in plan §6.2
  (hashed single-use tokens for team sign-in; scoped reusable tokens for approvers).

DESIGN
- Team screens: "Clean Ledger" — white surfaces, 0.5px hairlines, dense table dashboard, navy primary.
- Approver page (/review/[token]): "Reviewer-first" — full-width preview, a sticky bottom action bar with
  Approve (green) and Request changes (outline), approver list and version history below. Must work well on a phone.
- Import brand-tokens.css into globals.css and map the shadcn theme to it (primary = --uh-navy).
  Brand red is only for overdue/destructive states; status colors are the semantic ones in the token file.
- Place united-heritage-logo.png in /public/brand and use it in the header and email templates.
- Sentence case everywhere, two font weights (400/500), no emoji.

DATA MODEL — implement plan §6.4 exactly, including planned_rounds, review_window_days, revision_days on projects.
Add a pure function `buildSchedule(project)` in /lib/schedule.ts that returns the planned segments
(design → review 1 → revise → review 2 … → approved) and `latestSafeStart(project)`. Unit-test it with vitest.

PHASE 1 SCOPE (build in this order, commit after each)
1. Repo init, tooling, .env.example with DATABASE_URL, BLOB_READ_WRITE_TOKEN, RESEND_API_KEY, APP_URL, CRON_SECRET, SESSION_SECRET
2. Schema + migrations + seed script (1 owner, 1 designer, 2 demo projects, fake approvers)
3. Magic-link auth (team) + session middleware; /sign-in page
4. Projects CRUD: dashboard table with status pill, due date, progress (n/m approved), overdue badge, filters (All / Mine / In review / Overdue); new project form with dates, est hours, rounds/window/revision fields showing the computed schedule live
5. Items + versions: upload (PDF, JPG, PNG) direct to Blob; version list newest-first; PDF and image preview
6. Send for approval: add approver emails, review window, note → creates round + approvals, emails via Resend
7. Approver page via scoped token: approve / request changes with required comment; decision + all-approved emails to team
8. New version supersedes the round, copies approvers, re-emails them
9. Nudge button (rate-limited 1/hr/approver) + /api/cron/reminders (daily) for 50% and due-date reminders
10. Settings: team members, defaults for review window / rounds / revision days, reminder toggles
11. `vercel link`, set env vars, deploy; make sure the Cron is registered in vercel.json

RULES
- Every action writes an activity row. Tokens are stored hashed. Blob URLs are private + signed.
- Approver sessions can only read/write their own assigned items.
- Keep components small; no feature should require more than one page and one server action file.
- Ask me before adding any dependency not listed above.

Start by summarizing the plan back to me in 10 bullets and listing any ambiguities, then begin step 1.
```
