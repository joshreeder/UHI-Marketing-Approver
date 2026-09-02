import { RoundPill } from "@/components/status-pill";
import { ApproversList } from "@/components/approvers-list";
import { MarkAddressedButton } from "@/components/mark-addressed-button";
import { displayName, fmtBytes, fmtDate, fmtDateTime } from "@/lib/format";
import type { VersionDetail } from "@/lib/queries";

export function VersionHistory({
  versions,
  currentId,
  isTeam,
  fileLinks = true,
}: {
  versions: VersionDetail[]; // newest first
  currentId: string | null;
  isTeam: boolean;
  fileLinks?: boolean;
}) {
  const newest = versions[0];
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-white">
      {versions.map((v) => {
        const round = v.round;
        const approved = round?.approvals.filter((a) => a.status === "approved").length ?? 0;
        const total = round?.approvals.length ?? 0;
        const isCurrent = v.id === currentId;
        return (
          <details key={v.id} open={isCurrent} className="group">
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-canvas/60 [&::-webkit-details-marker]:hidden">
              <span className="font-medium text-ink">v{v.number}</span>
              <span className="text-slate">{fmtDate(v.createdAt)}</span>
              {round ? <RoundPill status={round.status} /> : <span className="pill pill-not-started">Not sent</span>}
              {total ? (
                <span className="text-xs text-slate">
                  {approved}/{total} approved
                </span>
              ) : null}
              {v.note ? <span className="truncate text-slate">— {v.note}</span> : null}
              <span className="ml-auto text-xs text-muted-ink group-open:hidden">Show</span>
              <span className="ml-auto hidden text-xs text-muted-ink group-open:inline">Hide</span>
            </summary>
            <div className="hairline-t border-line space-y-4 px-4 py-4">
              <div className="text-xs text-slate">
                Uploaded {fmtDateTime(v.createdAt)} by {displayName(v.uploader)}
                {v.fileName ? (
                  <>
                    {" · "}
                    {fileLinks ? (
                      <a href={`/api/files/${v.id}?download=1`} className="text-navy hover:underline">
                        {v.fileName}
                      </a>
                    ) : (
                      v.fileName
                    )}
                    {v.size ? ` (${fmtBytes(v.size)})` : ""}
                  </>
                ) : null}
                {round ? ` · Due ${fmtDateTime(round.dueAt)}` : ""}
              </div>

              {round ? (
                <div>
                  <h4 className="mb-1 text-xs font-medium text-slate">Approvers</h4>
                  <ApproversList round={round} canNudge={isTeam && isCurrent} />
                </div>
              ) : null}

              {v.comments.length ? (
                <div>
                  <h4 className="mb-1 text-xs font-medium text-slate">Change requests and comments</h4>
                  <ol className="space-y-2">
                    {v.comments.map((c, i) => (
                      <li key={c.id} className="rounded-lg bg-canvas px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate">
                          <span>
                            <span className="mr-1.5 inline-flex size-4 items-center justify-center rounded-full bg-navy text-[10px] text-white">{i + 1}</span>
                            {c.author ? displayName(c.author) : "Approver"} · {fmtDateTime(c.createdAt)}
                            {c.addressedInVersionId ? <span className="ml-2 text-[var(--status-approved)]">Addressed</span> : null}
                          </span>
                          {isTeam && newest && newest.id !== v.id ? (
                            <MarkAddressedButton commentId={c.id} addressedInVersionId={newest.id} addressed={!!c.addressedInVersionId} />
                          ) : null}
                        </div>
                        <p className={`mt-1 whitespace-pre-wrap text-ink ${c.addressedInVersionId ? "line-through decoration-muted-ink/60" : ""}`}>{c.body}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}
