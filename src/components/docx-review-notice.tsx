import { describeDocxReview, openCommentCount, trackedChangeCount, type DocxReview } from "@/lib/docx-review";
import { cn } from "@/lib/utils";

const KIND_LABEL = { insert: "Inserted", delete: "Deleted", move: "Moved", format: "Formatting changed" } as const;

/**
 * Warns that a Word upload still contains tracked changes or open comments. The preview shows the
 * text as if every change were accepted, so this is the only place the markup is visible in the app.
 */
export function DocxReviewNotice({
  review,
  fileName,
  downloadHref,
  audience,
  showClean = false,
  className,
}: {
  review: DocxReview | null | undefined;
  fileName?: string | null;
  downloadHref?: string;
  audience: "team" | "approver";
  /** Team only: show a quiet "clean file" line when there is nothing to flag. */
  showClean?: boolean;
  className?: string;
}) {
  if (!review) return null;
  const desc = describeDocxReview(review);
  if (!desc) {
    if (!showClean) return null;
    return (
      <p className={cn("rounded-lg bg-[var(--status-approved-bg)] px-3 py-2 text-xs text-[var(--status-approved)]", className)}>
        Clean Word file: no tracked changes or open comments.
        {review.trackChangesOn ? " Track Changes is still switched on, so new edits will be marked." : ""}
      </p>
    );
  }
  const changes = trackedChangeCount(review);
  const open = openCommentCount(review);
  return (
    <div className={cn("rounded-xl border border-[var(--status-changes)]/30 bg-[var(--status-changes-bg)] p-4 text-sm", className)}>
      <p className="font-medium text-[var(--status-changes)]">
        {audience === "team" ? `This Word file still has ${desc}.` : `This Word file contains ${desc}.`}
      </p>
      <p className="mt-1 text-xs text-ink/80">
        {audience === "team"
          ? "Approvers see the preview with every change accepted and no comments, so they would be approving text nobody has settled on. Accept or reject the changes and resolve the comments in Word, then upload the clean file as the next version."
          : "The preview shows the text as if all changes were accepted. Download the original to see the markup in Word."}
        {fileName && downloadHref ? (
          <>
            {" "}
            <a href={downloadHref} className="text-navy underline">
              Download {fileName}
            </a>
            .
          </>
        ) : null}
      </p>
      {review.changes.length || review.commentList.length ? (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-ink/80 hover:text-ink">
            Show details
            {review.authors.length ? ` · by ${review.authors.join(", ")}` : ""}
          </summary>
          <div className="mt-2 space-y-3">
            {changes ? (
              <ol className="space-y-1">
                {review.changes.map((c, i) => (
                  <li key={i} className="rounded-md bg-white/70 px-2 py-1">
                    <span className="font-medium text-ink">{KIND_LABEL[c.kind]}</span>
                    {c.author ? <span className="text-slate"> · {c.author}</span> : null}
                    {c.text ? <span className={cn("ml-1 text-ink", c.kind === "delete" && "line-through decoration-[var(--status-changes)]")}>“{c.text}”</span> : null}
                  </li>
                ))}
                {changes > review.changes.length ? <li className="text-slate">… and {changes - review.changes.length} more</li> : null}
              </ol>
            ) : null}
            {review.commentList.length ? (
              <ol className="space-y-1">
                {review.commentList.map((c, i) => (
                  <li key={i} className={cn("rounded-md bg-white/70 px-2 py-1", c.resolved && "opacity-60")}>
                    <span className="font-medium text-ink">{c.resolved ? "Resolved comment" : "Comment"}</span>
                    {c.author ? <span className="text-slate"> · {c.author}</span> : null}
                    {c.text ? <span className="ml-1 text-ink">“{c.text}”</span> : null}
                  </li>
                ))}
                {review.comments > review.commentList.length ? <li className="text-slate">… and {review.comments - review.commentList.length} more</li> : null}
              </ol>
            ) : null}
            {open === 0 && review.resolvedComments ? <p className="text-slate">All {review.resolvedComments} comments are resolved.</p> : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
