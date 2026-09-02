# Deploying Approval Hub

Vercel project: `josh-reeders-projects/uhi-approval-hub` (linked to GitHub `joshreeder/UHI-Marketing-Approver`, branch `main`).
Every push to `main` deploys production; PRs get preview deployments.

## Already configured (2026-09-02)

- Vercel Blob store `approval-hub-files` (private) linked → `BLOB_READ_WRITE_TOKEN` on all environments
- `SESSION_SECRET`, `CRON_SECRET` (production + preview), `APP_URL` (production), `EMAIL_FROM` (production + preview)
- Cron: `vercel.json` runs `/api/cron/reminders` daily at 14:00 UTC (8 am Mountain)
- `packageManager` pinned to pnpm 10 (pnpm 11 on Vercel rejects packages younger than 24 h)
- Neon database `approval-hub-db` (region iad1) created on the team's existing Neon installation, which is on
  Neon's **Launch** plan (it was set up earlier via v0). Picking "Free" in the Vercel form fails because the plan is
  set per installation, not per database. `DATABASE_URL` is on all environments; schema migrated and demo data seeded.

## Remaining one-time steps

1. **Email (Resend)** — create an API key, verify the sending domain (IT adds the SPF/DKIM DNS records), then:
   ```bash
   printf '<key>' | pnpm dlx vercel@latest env add RESEND_API_KEY production
   printf 'Approval Hub <approvals@yourdomain.com>' | pnpm dlx vercel@latest env add EMAIL_FROM production
   ```
   Until then, emails are written to the function logs instead of being sent.

2. **Custom domain** (optional): add e.g. `approvals.unitedheritage.com` in Vercel → Domains, then update `APP_URL`.

3. **Owner account**: the seed made josh.reeder@riverence.com the owner. Add the marketing manager under Settings → Team members
   as an owner, then remove yourself if you like. When you want to wipe the demo data, re-run `pnpm db:seed` with
   `SEED_OWNER_EMAIL` set to her email — it deletes the demo projects and recreates them.

## Running migrations later

Schema changes: edit `src/lib/db/schema.ts`, `pnpm db:generate`, commit the new file in `drizzle/`, then
`pnpm dlx vercel@latest env pull .env.local && set -a && source .env.local && set +a && pnpm db:migrate`.

## Local development without Neon

Any Postgres works locally (the app switches to node-postgres for non-Neon URLs). For example with Postgres
installed via Homebrew: `createdb approval_hub` and set `DATABASE_URL=postgres://localhost/approval_hub` in `.env`.
