# Deploying Approval Hub

Vercel project: `josh-reeders-projects/uhi-approval-hub` (linked to GitHub `joshreeder/UHI-Marketing-Approver`, branch `main`).
Every push to `main` deploys production; PRs get preview deployments.

## Already configured (2026-09-02)

- Vercel Blob store `approval-hub-files` (private) linked → `BLOB_READ_WRITE_TOKEN` on all environments
- `SESSION_SECRET`, `CRON_SECRET` (production + preview), `APP_URL` (production), `EMAIL_FROM` (production + preview)
- Cron: `vercel.json` runs `/api/cron/reminders` daily at 14:00 UTC (8 am Mountain)
- `packageManager` pinned to pnpm 10 (pnpm 11 on Vercel rejects packages younger than 24 h)

## Remaining one-time steps

1. **Postgres (Neon via Vercel Marketplace)** — needs a browser click to accept Neon's terms:
   ```bash
   pnpm dlx vercel@latest integration add neon --name approval-hub-db --plan free_v3
   ```
   This adds `DATABASE_URL` to the project and pulls it into `.env.local`. Then apply the schema and seed:
   ```bash
   pnpm dlx vercel@latest env pull .env.local
   set -a; source .env.local; set +a
   pnpm db:migrate
   SEED_OWNER_EMAIL=<marketing manager email> pnpm db:seed   # optional demo data
   ```
   Redeploy afterwards (`git commit --allow-empty -m "redeploy" && git push`, or the Vercel dashboard).

2. **Email (Resend)** — create an API key, verify the sending domain (IT adds the SPF/DKIM DNS records), then:
   ```bash
   printf '<key>' | pnpm dlx vercel@latest env add RESEND_API_KEY production
   printf 'Approval Hub <approvals@yourdomain.com>' | pnpm dlx vercel@latest env add EMAIL_FROM production
   ```
   Until then, emails are written to the function logs instead of being sent.

3. **Custom domain** (optional): add e.g. `approvals.unitedheritage.com` in Vercel → Domains, then update `APP_URL`.

4. **First sign-in**: with an empty `users` table, the first person to request a sign-in link becomes the owner.
   Add designers under Settings → Team members.

## Local development without Neon

Any Postgres works locally (the app switches to node-postgres for non-Neon URLs). For example with Postgres
installed via Homebrew: `createdb approval_hub` and set `DATABASE_URL=postgres://localhost/approval_hub` in `.env`.
