import { buildSchedule, scheduleWarning, type ScheduleInput, type SegmentKind } from "@/lib/schedule";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLOR: Record<SegmentKind, string> = {
  design: "bg-navy",
  review: "bg-[var(--status-in-review)]",
  revise: "bg-[var(--uh-muted)]",
  approved: "bg-[var(--status-approved)]",
};

/**
 * Planned schedule strip: design → review 1 → revise → … → approved. Pure presentational;
 * safe to render on the server or inside a client form.
 */
export function ScheduleBar({ input, compact = false, className }: { input: ScheduleInput; compact?: boolean; className?: string }) {
  const s = buildSchedule(input);
  const total = Math.max(1, s.segments.reduce((n, seg) => n + seg.days, 0));
  const warning = scheduleWarning(s, fmtDate);
  const today = new Date();
  const todayPct =
    today >= s.start && today <= s.end ? ((today.getTime() - s.start.getTime()) / (s.end.getTime() - s.start.getTime())) * 100 : null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <div className="flex h-6 w-full overflow-hidden rounded-md ring-1 ring-line">
          {s.segments
            .filter((seg) => seg.days > 0)
            .map((seg, i) => (
              <div
                key={i}
                className={cn("relative flex items-center justify-center text-[11px] font-medium text-white", COLOR[seg.kind])}
                style={{ width: `${(seg.days / total) * 100}%` }}
                title={`${seg.label}: ${fmtDate(seg.start)} → ${fmtDate(seg.end)} (${seg.days}d)`}
              >
                {!compact && seg.days / total > 0.09 ? <span className="truncate px-1">{seg.label}</span> : null}
              </div>
            ))}
        </div>
        {todayPct != null ? (
          <div className="absolute -top-1 bottom-0 w-px bg-brand-red" style={{ left: `${todayPct}%` }} title="Today">
            <span className="absolute -top-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand-red" />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate">
        <span>
          {fmtDate(s.start)} → planned approval {fmtDate(s.end)}
          {s.dueDate ? ` · due ${fmtDate(s.dueDate)}` : ""}
        </span>
        <span>
          {s.designDays}d design · {s.reviewChainDays}d reviews
        </span>
      </div>
      {warning ? <p className="rounded-md bg-brand-red-tint px-3 py-2 text-xs text-brand-red">{warning}</p> : null}
    </div>
  );
}
