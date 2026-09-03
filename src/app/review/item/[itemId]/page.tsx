import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { AnnotatedPreview } from "@/components/annotated-preview";
import { commentsToPins } from "@/lib/pins";
import { ApproversList } from "@/components/approvers-list";
import { ReviewActions } from "@/components/review-actions";
import { AddCommentForm } from "@/components/add-comment-form";
import { VersionHistory } from "@/components/version-history";
import { RoundPill } from "@/components/status-pill";
import { ChangesCard } from "@/components/changes-card";
import { CopyDiff } from "@/components/copy-diff";
import { DocxReviewNotice } from "@/components/docx-review-notice";
import { DownloadWordMenu } from "@/components/download-word-menu";
import { canAccessItem, getSession } from "@/lib/auth/session";
import { getItemDetail } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { displayName, fmtDateTime, fmtDueLong } from "@/lib/format";
import { isCopyVersion } from "@/lib/copy";

export const metadata: Metadata = { title: "Review" };
export const dynamic = "force-dynamic";

/** Reviewer-first page approvers land on. Also viewable by team members for checking. */
export default async function ReviewItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const session = await getSession();
  if (!session) redirect(`/review/expired?item=${itemId}`);
  if (!canAccessItem(session, itemId)) redirect(`/review/expired?item=${itemId}`);

  const [detail, settings] = await Promise.all([getItemDetail(itemId), getSettings()]);
  if (!detail) redirect("/review/expired");
  const settings = await getSettings();
  const { item, project, versions, current } = detail;
  const previous = versions[1] ?? null;
  const showDiff = !!current && !!previous && isCopyVersion(current) && isCopyVersion(previous);
  const round = current?.round ?? null;
  const mine = round?.approvals.find((a) => a.userId === session.user.id) ?? null;
  const canDecide = !!mine && mine.status === "waiting" && round && round.status !== "superseded" && round.status !== "approved";
  const overdue = round && round.status === "pending" && round.dueAt < new Date();

  return (
    <div className="min-h-dvh bg-canvas pb-32">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 sm:px-6">
          <BrandLogo href={session.isTeam ? `/items/${item.id}` : null} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-slate">{project.name}</div>
            <h1 className="truncate text-base font-medium text-ink sm:text-lg">
              {item.title} {current ? <span className="font-normal text-slate">v{current.number}</span> : null}
            </h1>
          </div>
          {round ? <RoundPill status={round.status} className="hidden sm:inline-flex" /> : null}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        {!current ? (
          <p className="rounded-xl border border-line bg-white px-5 py-8 text-center text-sm text-slate">Nothing to review yet.</p>
        ) : (
          <>
            <section className="rounded-xl border border-line bg-white p-4 text-sm sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-ink">
                  <span className="font-medium">{displayName(current.uploader)}</span> sent this {fmtDateTime(current.createdAt)}
                </p>
                {round ? (
                  <p className={overdue ? "text-brand-red" : "text-slate"}>
                    {round.status === "approved" ? "Approved by everyone" : `${overdue ? "Was due" : "Due"} ${fmtDueLong(round.dueAt)}`}
                  </p>
                ) : null}
              </div>
              {current.note ? <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-ink">{current.note}</p> : null}
              <ChangesCard versions={versions} versionId={current.id} className="mt-3" />
              {isCopyVersion(current) ? (
                <div className="mt-3 flex justify-end">
                  <DownloadWordMenu versionId={current.id} hasLetterhead={!!settings.letterhead} size="sm" variant="outline" />
                </div>
              ) : null}
              {mine && mine.status !== "waiting" ? (
                <p className={`mt-3 rounded-lg px-3 py-2 ${mine.status === "approved" ? "bg-[var(--status-approved-bg)] text-[var(--status-approved)]" : "bg-[var(--status-changes-bg)] text-[var(--status-changes)]"}`}>
                  You {mine.status === "approved" ? "approved" : "requested changes on"} this version {fmtDateTime(mine.decidedAt)}. Thank you.
                </p>
              ) : null}
              {round?.status === "superseded" ? (
                <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-slate">A newer version replaced this one. Check your email for the latest link.</p>
              ) : null}
            </section>

            {current.docxReview ? <DocxReviewNotice review={current.docxReview} fileName={current.fileName} downloadHref={`/api/files/${current.id}?download=1`} audience="approver" /> : null}

            <AnnotatedPreview version={current} letter={settings.letter} pins={commentsToPins(current.comments)} canPin={!!mine && !!round && (round.status === "pending" || round.status === "changes_requested")} approvalId={mine?.id ?? null} />

            {showDiff && previous ? <CopyDiff previous={previous} current={current} defaultOpen /> : null}

            {round ? (
              <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
                <h2 className="text-sm font-medium text-ink">Who is reviewing</h2>
                <div className="mt-2">
                  <ApproversList round={round} canNudge={false} highlightUserId={session.user.id} />
                </div>
              </section>
            ) : null}

            {mine && !canDecide && round && round.status !== "superseded" ? (
              <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
                <h2 className="mb-2 text-sm font-medium text-ink">Add a comment</h2>
                <AddCommentForm versionId={current.id} approvalId={mine.id} />
              </section>
            ) : null}

            {versions.length > 1 || current.comments.length ? (
              <section>
                <h2 className="mb-2 text-sm font-medium text-ink">History</h2>
                <VersionHistory versions={versions} currentId={current.id} isTeam={false} fileLinks />
              </section>
            ) : null}
          </>
        )}
      </main>

      {canDecide && mine && current ? <ReviewActions approvalId={mine.id} versionNumber={current.number} /> : null}
    </div>
  );
}
