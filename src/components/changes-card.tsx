import { RESOLUTION_LABEL, type Resolution } from "@/lib/resolutions";
import type { VersionDetail } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** "What changed in this version": the comments from earlier versions that this version resolved. */
export function ChangesCard({ versions, versionId, className }: { versions: VersionDetail[]; versionId: string; className?: string }) {
  const resolved = versions.flatMap((v) => v.comments.filter((c) => c.resolvedInVersionId === versionId).map((c) => ({ ...c, fromVersion: v.number })));
  if (resolved.length === 0) return null;
  const groups: { key: Resolution; title: string; items: typeof resolved }[] = [
    { key: "addressed" as const, title: "Addressed", items: resolved.filter((c) => c.resolution === "addressed") },
    { key: "deferred" as const, title: "Coming in a later version", items: resolved.filter((c) => c.resolution === "deferred") },
    { key: "declined" as const, title: "Not changing", items: resolved.filter((c) => c.resolution === "declined") },
  ].filter((g) => g.items.length);
  return (
    <div className={cn("rounded-lg border border-line bg-white p-3 text-sm", className)}>
      <p className="text-xs font-medium text-slate">Changes in this version</p>
      {groups.map((g) => (
        <div key={g.key} className="mt-2">
          <p className={cn("text-xs", g.key === "addressed" ? "text-[var(--status-approved)]" : g.key === "deferred" ? "text-[var(--status-in-review)]" : "text-slate")}>
            {RESOLUTION_LABEL[g.key]} · {g.title}
          </p>
          <ul className="mt-1 space-y-1">
            {g.items.map((c) => (
              <li key={c.id} className={cn("flex gap-2 text-ink", g.key === "addressed" && "line-through decoration-muted-ink/60")}>
                <span className="text-slate">{g.key === "addressed" ? "✓" : g.key === "deferred" ? "→" : "–"}</span>
                <span>
                  {c.body} <span className="text-xs text-slate">(v{c.fromVersion})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
