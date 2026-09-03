# Approval Hub

Internal proof-and-approval tracker for United Heritage Insurance marketing. Designers upload
versions of a piece (PDF, image or Word file, or copy written in the built-in editor), send them to approvers by email, and track approvals and
change requests per version. Copy versions show a word-level diff between versions and can be downloaded as a Word document on the company letterhead;
Word uploads are checked for unresolved tracked changes and comments. Approvers never create accounts — the link in their email signs
them in.

The full plan is in [docs/plan.md](docs/plan.md); the build brief is [docs/kickoff.md](docs/kickoff.md).
How to use the app: [docs/USER-GUIDE.md](docs/USER-GUIDE.md) (also the **Help** page inside the app). Deploy notes: [docs/DEPLOY.md](docs/DEPLOY.md).

## Stack

Next.js 15 (App Router, TypeScript strict) · Tailwind v4 + shadcn/ui · Drizzle ORM on Postgres
(Neon in production) · Vercel Blob (private) · Resend + React Email · Vercel Cron · PDF.js · TipTap (copy editor) ·
JSZip + htmlparser2 (Word inspection and export) · sanitize-html · jsdiff.

## Local development

```bash
pnpm install
cp .env.example .env        # fill in the values below
pnpm db:migrate             # applies ./drizzle to DATABASE_URL
pnpm db:seed                # demo owner, designer, 2 projects, fake approvers
pnpm dev
```

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon (pooled) or any Postgres. Neon hosts use the HTTP driver; anything else uses node-postgres. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token. Files are stored `access: private` and streamed through `/api/files/[versionId]`. |
| `RESEND_API_KEY` | Optional locally. Without it, every email is printed to the server log (including sign-in and review links). |
| `EMAIL_FROM` | Must be on a domain verified in Resend. |
| `APP_URL` | Public origin, used in emails and links. |
| `CRON_SECRET` | Vercel Cron sends it as `Authorization: Bearer …` to `/api/cron/reminders`. |
| `SESSION_SECRET` | HMAC key for hashing session, sign-in and approver tokens. Rotating it invalidates all links. |
| `SEED_OWNER_EMAIL` | Seed only: which email becomes the owner. |

First sign-in: if no owner exists yet, the first person to request a sign-in link becomes the owner.

## Scripts

`pnpm dev` · `pnpm build` (migrates, then builds; `pnpm build:app` skips the migration) · `pnpm test` (schedule math, Word inspection/export, copy helpers) · `pnpm typecheck` · `pnpm lint` ·
`pnpm db:generate` (new migration from schema changes) · `pnpm db:migrate` · `pnpm db:seed` · `pnpm db:studio`

## How it fits together

- `src/lib/db/schema.ts` — tables from plan §6.4. Migrations in `drizzle/`.
- `src/lib/schedule.ts` — `buildSchedule()`, `latestSafeStart()`, `roundsThatFit()` (unit-tested).
- `src/lib/auth/` — hashed single-use team magic links; reusable scoped approver tokens; 30-day sessions.
- `src/lib/rounds.ts` — start a round, supersede with a new version, reminders/nudges, record decisions.
- `src/lib/email/` — React Email templates and the Resend sender (log fallback in dev).
- `src/lib/copy.ts`, `copy-server.ts`, `copy-diff.ts` — copy versions: HTML ↔ text, allow-list sanitiser for editor output, word-level diff.
- `src/lib/docx-review.ts` — finds tracked changes and comments inside a .docx (runs in the browser before upload and on the server on save).
- `src/lib/docx.ts` — Word preview (mammoth) plus the inspection above, stored on `versions.docx_review`.
- `src/lib/docx-export.ts` — builds a .docx from copy HTML, optionally inside the letterhead template from Settings (`/api/export/[versionId]`).
- `src/app/(app)/` — team screens: dashboard, projects, items, settings.
- `src/app/review/` — approver entry (`/review/[token]`) and the reviewer-first page (`/review/item/[itemId]`).
- `src/app/api/` — Blob upload tokens, private file streaming, daily reminder cron.

Every action writes an `activity` row. Approver sessions can only read and act on the item their
link was issued for.
