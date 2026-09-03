import type { Version } from "@/lib/db/schema";
import { diffCopy } from "@/lib/copy-diff";

/**
 * "What changed since vN": word-level diff between two copy versions, rendered server-side.
 * Additions are highlighted green, removals red with a strikethrough.
 */
export function CopyDiff({ previous, current, defaultOpen = false }: { previous: Version; current: Version; defaultOpen?: boolean }) {
  const diff = diffCopy(previous.emailHtml ?? "", current.emailHtml ?? "");
  const meta: string[] = [];
  if ((previous.emailSubject ?? "") !== (current.emailSubject ?? "")) {
    meta.push(`Subject: “${previous.emailSubject ?? ""}” → “${current.emailSubject ?? ""}”`);
  }
  if ((previous.emailFromName ?? "") !== (current.emailFromName ?? "")) {
    meta.push(`From name: “${previous.emailFromName ?? ""}” → “${current.emailFromName ?? ""}”`);
  }
  const nothing = diff.unchanged && meta.length === 0;
  const summary = nothing
    ? `No text changes since v${previous.number}`
    : `What changed since v${previous.number}: ${[
        diff.addedWords ? `+${diff.addedWords} word${diff.addedWords === 1 ? "" : "s"}` : null,
        diff.removedWords ? `−${diff.removedWords} word${diff.removedWords === 1 ? "" : "s"}` : null,
        meta.length ? `${meta.length} header change${meta.length === 1 ? "" : "s"}` : null,
      ]
        .filter(Boolean)
        .join(", ")}`;

  return (
    <details open={defaultOpen && !nothing} className="group rounded-xl border border-line bg-white">
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm hover:bg-canvas/60 [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-ink">{summary}</span>
        {!nothing ? (
          <>
            <span className="ml-auto text-xs text-muted-ink group-open:hidden">Show</span>
            <span className="ml-auto hidden text-xs text-muted-ink group-open:inline">Hide</span>
          </>
        ) : null}
      </summary>
      {!nothing ? (
        <div className="hairline-t border-line px-4 py-4 text-[15px] leading-7 text-ink">
          {meta.length ? (
            <ul className="mb-3 space-y-1 text-sm text-slate">
              {meta.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
          <p className="mb-2 text-xs text-slate">
            <span className="rounded bg-[var(--status-approved-bg)] px-1 text-[var(--status-approved)]">added</span>{" "}
            <span className="rounded bg-[var(--status-changes-bg)] px-1 text-[var(--status-changes)] line-through">removed</span>
          </p>
          <div className="whitespace-pre-wrap">
            {diff.parts.map((p, i) =>
              p.added ? (
                <ins key={i} className="rounded bg-[var(--status-approved-bg)] px-0.5 text-[var(--status-approved)] no-underline">
                  {p.value}
                </ins>
              ) : p.removed ? (
                <del key={i} className="rounded bg-[var(--status-changes-bg)] px-0.5 text-[var(--status-changes)]">
                  {p.value}
                </del>
              ) : (
                <span key={i}>{p.value}</span>
              ),
            )}
          </div>
        </div>
      ) : null}
    </details>
  );
}
