"use client";

import { RESOLUTION_LABEL, type CommentResolution, type OpenComment, type Resolution } from "@/lib/resolutions";
import { cn } from "@/lib/utils";

/**
 * Approver comments as a to-do list on the "new version" form. Each gets Done / Next version / Won't do.
 * Unanswered comments default to "Next version" so nothing silently disappears.
 */
export function ResolutionChecklist({ comments, value, onChange }: { comments: OpenComment[]; value: CommentResolution[]; onChange: (v: CommentResolution[]) => void }) {
  if (comments.length === 0) return null;
  const get = (id: string): Resolution => value.find((r) => r.commentId === id)?.resolution ?? "deferred";
  const set = (id: string, resolution: Resolution) => onChange([...value.filter((r) => r.commentId !== id), { commentId: id, resolution }]);
  const done = comments.filter((c) => get(c.id) === "addressed").length;

  return (
    <div className="rounded-xl border border-line bg-canvas/60 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-medium text-ink">What did this version change?</p>
        <span className="text-xs text-slate">
          {done}/{comments.length} done
        </span>
      </div>
      <ul className="space-y-2">
        {comments.map((c) => {
          const r = get(c.id);
          return (
            <li key={c.id} className="rounded-lg bg-white p-2.5 ring-1 ring-line">
              <div className="flex flex-wrap items-start gap-2">
                <button
                  type="button"
                  onClick={() => set(c.id, r === "addressed" ? "deferred" : "addressed")}
                  aria-pressed={r === "addressed"}
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border text-[11px]",
                    r === "addressed" ? "border-[var(--status-approved)] bg-[var(--status-approved)] text-white" : "border-line bg-white text-transparent hover:border-navy",
                  )}
                  title="Mark done"
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm text-ink", r === "addressed" && "line-through decoration-muted-ink/60", r === "declined" && "text-slate")}>{c.body}</p>
                  <p className="mt-0.5 text-[11px] text-slate">
                    {c.author} · on v{c.versionNumber}
                    {c.pinned ? ` · pinned${c.pageNo ? ` p.${c.pageNo}` : ""}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 text-[11px]">
                  {(["addressed", "deferred", "declined"] as Resolution[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set(c.id, opt)}
                      className={cn(
                        "rounded-full px-2 py-0.5 ring-1 ring-line",
                        r === opt
                          ? opt === "addressed"
                            ? "bg-[var(--status-approved)] text-white ring-transparent"
                            : opt === "deferred"
                              ? "bg-[var(--status-in-review)] text-white ring-transparent"
                              : "bg-slate text-white ring-transparent"
                          : "bg-white text-slate hover:text-ink",
                      )}
                    >
                      {RESOLUTION_LABEL[opt]}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-slate">Approvers get this list in the new-version email. Anything marked Next version stays on the to-do list.</p>
    </div>
  );
}
