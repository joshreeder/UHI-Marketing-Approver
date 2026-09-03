import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ActivityFeed } from "@/components/activity-feed";
import { ApproversList } from "@/components/approvers-list";
import { AnnotatedPreview } from "@/components/annotated-preview";
import { commentsToPins } from "@/lib/pins";
import { SendForApprovalForm } from "@/components/send-for-approval-form";
import { RoundPill } from "@/components/status-pill";
import { UploadVersionDialog } from "@/components/upload-version-dialog";
import { SendTestButton } from "@/components/send-test-button";
import { DownloadWordMenu } from "@/components/download-word-menu";
import { CopyDiff } from "@/components/copy-diff";
import { DocxReviewNotice } from "@/components/docx-review-notice";
import { VersionForm } from "@/components/version-form";
import { ChangesCard } from "@/components/changes-card";
import { openCommentsFromVersions } from "@/lib/resolutions";
import { VersionHistory } from "@/components/version-history";
import { requireTeam } from "@/lib/auth/session";
import { getItemDetail, listPastApproverEmails } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { displayName, fmtDateTime, fmtRelative } from "@/lib/format";
import { isCopyVersion } from "@/lib/copy";
import { describeDocxReview } from "@/lib/docx-review";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getItemDetail(id);
  return { title: d ? `${d.item.title} · ${d.project.name}` : "Item" };
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeam();
  const { id } = await params;
  const [detail, pastApprovers, settings] = await Promise.all([getItemDetail(id), listPastApproverEmails(), getSettings()]);
  if (!detail) notFound();
  const { item, project, versions, current, activity } = detail;
  const previous = versions[1] ?? null;
  const showDiff = !!current && !!previous && isCopyVersion(current) && isCopyVersion(previous);
  const markup = describeDocxReview(current?.docxReview);
  const round = current?.round ?? null;
  const approved = round?.approvals.filter((a) => a.status === "approved").length ?? 0;
  const total = round?.approvals.length ?? 0;
  const roundOpen = round && (round.status === "pending" || round.status === "changes_requested");
  const overdue = roundOpen && round.dueAt < new Date();
  const windowDays = item.reviewWindowDays ?? project.reviewWindowDays;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href={`/projects/${project.id}`} className="hover:text-ink">
            ← {project.name}
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            {item.title}
            {current ? <span className="text-slate">v{current.number}</span> : null}
            {round ? <RoundPill status={round.status} /> : current ? <span className="pill pill-not-started">Not sent</span> : null}
          </span>
        }
        actions={
          current ? (
          <UploadVersionDialog
            itemId={item.id}
            nextNumber={(current?.number ?? 0) + 1}
            willResend={!!round && round.status !== "superseded"}
            defaultMode={current && isCopyVersion(current) ? "copy" : "file"}
            initialCopy={
              current && isCopyVersion(current)
                ? { subject: current.emailSubject ?? "", fromName: current.emailFromName ?? "", body: current.emailHtml ?? "", layout: (current.copyLayout as "email" | "letter" | null) ?? "email" }
                : undefined
            }
            openComments={openCommentsFromVersions(versions)}
          />
          ) : null
        }
      />

      {!current ? (
        <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
          <h2 className="text-base font-medium text-ink">Add the piece to review</h2>
          <p className="mb-4 mt-1 text-sm text-slate">Drop in the artwork, PDF or Word document, or paste the email copy. You will preview it next and then send it to approvers.</p>
          <VersionForm target={{ kind: "item", itemId: item.id }} nextNumber={1} inline />
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <AnnotatedPreview version={current} letter={settings.letter} pins={commentsToPins(current.comments)} canPin={false} />
            {showDiff && previous ? <CopyDiff previous={previous} current={current} /> : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-ink">Version {current.number}</h2>
                  <p className="text-xs text-slate">
                    {fmtDateTime(current.createdAt)} · {displayName(current.uploader)}
                  </p>
                </div>
                {current.fileName ? (
                  <Button variant="ghost" size="xs" nativeButton={false} render={<a href={`/api/files/${current.id}?download=1`} />}>
                    Download
                  </Button>
                ) : isCopyVersion(current) ? (
                  <span className="flex flex-wrap justify-end gap-1">
                    <DownloadWordMenu versionId={current.id} hasLetterhead={!!settings.letterhead} />
                    <SendTestButton versionId={current.id} />
                  </span>
                ) : null}
              </div>
              {current.note ? <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-sm text-ink">{current.note}</p> : null}
              <ChangesCard versions={versions} versionId={current.id} className="mt-3" />
              {current.docxReview ? (
                <DocxReviewNotice review={current.docxReview} fileName={current.fileName} downloadHref={`/api/files/${current.id}?download=1`} audience="team" showClean className="mt-3" />
              ) : null}
            </section>

            {round ? (
              <section className="rounded-xl border border-line bg-white p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-ink">Approvals</h2>
                  <span className="text-xs text-slate">
                    {approved}/{total} approved
                  </span>
                </div>
                <p className={`mt-1 text-xs ${overdue ? "text-brand-red" : "text-slate"}`}>
                  {round.status === "approved"
                    ? `Approved ${fmtRelative(round.completedAt)}`
                    : round.status === "superseded"
                      ? "Superseded"
                      : `${overdue ? "Was due" : "Due"} ${fmtDateTime(round.dueAt)}${overdue ? " · overdue" : ""}`}
                </p>
                <div className="mt-3">
                  <ApproversList round={round} canNudge />
                </div>
                {round.status === "changes_requested" ? (
                  <p className="mt-3 rounded-lg bg-[var(--status-changes-bg)] px-3 py-2 text-xs text-[var(--status-changes)]">
                    Changes were requested. Upload a new version to start the next round; approvers are re-emailed automatically.
                  </p>
                ) : null}
              </section>
            ) : (
              <section className="rounded-xl border border-line bg-white p-5">
                <h2 className="text-sm font-medium text-ink">Send for approval</h2>
                <p className="mb-3 mt-1 text-xs text-slate">Each approver gets an email with a personal link to this version.</p>
                <SendForApprovalForm versionId={current.id} defaultWindow={windowDays} pastApprovers={pastApprovers} markupWarning={markup} />
              </section>
            )}
          </aside>
        </div>
      )}

      {versions.length ? (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-medium text-ink">Version history</h2>
          <VersionHistory versions={versions} currentId={current?.id ?? null} isTeam />
        </section>
      ) : null}

      <section className="mt-8 rounded-xl border border-line bg-white p-5">
        <h2 className="mb-2 text-sm font-medium text-ink">Activity</h2>
        <ActivityFeed rows={activity} />
      </section>
    </>
  );
}
