import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireOwner } from "@/lib/auth/session";
import { listTeamMembers } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { DefaultsForm, TeamForm } from "./forms";
import { LetterheadForm } from "@/components/letterhead-form";
import { removeTeamMember } from "./actions";
import { Button } from "@/components/ui/button";
import { displayName } from "@/lib/format";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireOwner();
  const [team, settings] = await Promise.all([listTeamMembers(), getSettings()]);
  const emailConfigured = !!env.RESEND_API_KEY;
  const blobConfigured = !!env.BLOB_READ_WRITE_TOKEN;
  const webhookConfigured = !!env.RESEND_WEBHOOK_SECRET;

  return (
    <>
      <PageHeader title="Settings" description="Team access, planning defaults, and reminder behaviour." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-white">
          <div className="hairline-b border-line px-5 py-3">
            <h2 className="text-sm font-medium text-ink">Team members</h2>
            <p className="text-xs text-slate">Owners and designers sign in with a magic link. Approvers never need to be added here.</p>
          </div>
          <ul>
            {team.map((u) => (
              <li key={u.id} className="hairline-b border-line flex items-center gap-3 px-5 py-2.5 text-sm last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-ink">{displayName(u)}</div>
                  {u.name ? <div className="truncate text-xs text-slate">{u.email}</div> : null}
                </div>
                <span className="pill pill-not-started capitalize">{u.role}</span>
                {u.id !== session.user.id ? (
                  <form action={removeTeamMember.bind(null, u.id)}>
                    <Button type="submit" variant="ghost" size="xs">
                      Remove
                    </Button>
                  </form>
                ) : (
                  <span className="w-14 text-right text-xs text-muted-ink">you</span>
                )}
              </li>
            ))}
          </ul>
          <div className="hairline-t border-line px-5 py-4">
            <TeamForm />
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-sm font-medium text-ink">Defaults and reminders</h2>
            <p className="mb-4 text-xs text-slate">New projects start with these. Reminders go out daily at 8 am Mountain.</p>
            <DefaultsForm settings={settings} />
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-sm font-medium text-ink">Word letterhead</h2>
            <p className="mb-4 text-xs text-slate">
              Copy versions (letters, announcements, email text) can be downloaded as a Word document. With a letterhead uploaded here, the download uses its header, footer and styles.
              {!blobConfigured ? " File storage must be configured first." : ""}
            </p>
            <LetterheadForm letterhead={settings.letterhead} />
          </section>

          <section className="rounded-xl border border-line bg-white p-5 text-sm">
            <h2 className="text-sm font-medium text-ink">Integrations</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate">Email (Resend)</dt>
              <dd>{emailConfigured ? <span className="text-[var(--status-approved)]">Configured</span> : <span className="text-brand-red">Not configured — emails print to the server log</span>}</dd>
              <dt className="text-slate">File storage (Blob)</dt>
              <dd>{blobConfigured ? <span className="text-[var(--status-approved)]">Configured</span> : <span className="text-brand-red">Not configured — uploads disabled</span>}</dd>
              <dt className="text-slate">Email open tracking</dt>
              <dd>{webhookConfigured ? <span className="text-[var(--status-approved)]">Configured</span> : <span className="text-slate">Not configured — add a Resend webhook for email.opened / email.clicked pointing at {env.APP_URL}/api/webhooks/resend and set RESEND_WEBHOOK_SECRET</span>}</dd>
              <dt className="text-slate">Sending from</dt>
              <dd className="text-ink">{env.EMAIL_FROM}</dd>
              <dt className="text-slate">App URL</dt>
              <dd className="text-ink">{env.APP_URL}</dd>
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
