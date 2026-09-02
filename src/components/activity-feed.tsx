import { describeActivity } from "@/lib/activity";
import { fmtDateTime } from "@/lib/format";
import type { Activity, User } from "@/lib/db/schema";

export function ActivityFeed({ rows, emptyText = "No activity yet." }: { rows: (Activity & { actor: User | null })[]; emptyText?: string }) {
  if (rows.length === 0) return <p className="text-sm text-slate">{emptyText}</p>;
  return (
    <ol className="space-y-0">
      {rows.map((a) => (
        <li key={a.id} className="hairline-b border-line flex items-baseline justify-between gap-4 py-2 last:border-b-0">
          <span className="text-sm text-ink">{describeActivity(a)}</span>
          <time className="shrink-0 text-xs text-slate" dateTime={a.createdAt.toISOString()}>
            {fmtDateTime(a.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
