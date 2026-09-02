"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addDays, differenceInCalendarDays, format, isMonday, startOfDay } from "date-fns";
import { toast } from "sonner";
import { shiftProjectDates } from "@/app/(app)/projects/actions";
import { STATUS_LABEL } from "@/lib/status";
import type { ProjectStatus, RoundStatus } from "@/lib/db/schema";
import type { SegmentKind } from "@/lib/schedule";

type Row = {
  id: string;
  name: string;
  status: ProjectStatus;
  designer: string | null;
  start: string | null;
  due: string | null;
  overdueDays: number;
  planned: { kind: SegmentKind; label: string; start: string; end: string }[];
  actual: { label: string; versionNumber: number; start: string; end: string; status: RoundStatus; open: boolean; overdue: boolean }[];
  driftDays: number | null;
  extraRounds: number;
};

const PX_PER_DAY = 26;
const LABEL_W = 240;
const ROW_H = 56;
const HEADER_H = 36;

const STATUS_COLOR: Record<ProjectStatus, string> = {
  not_started: "var(--uh-muted)",
  in_progress: "var(--uh-navy)",
  in_review: "var(--status-in-review)",
  changes_requested: "var(--status-changes)",
  approved: "var(--status-approved)",
  done: "var(--status-approved)",
  on_hold: "var(--uh-muted)",
  cancelled: "var(--uh-muted)",
};
const SEG_COLOR: Record<SegmentKind, string> = {
  design: "var(--uh-navy)",
  review: "var(--status-in-review)",
  revise: "var(--uh-muted)",
  approved: "var(--status-approved)",
};
const ROUND_COLOR: Record<RoundStatus, string> = {
  pending: "var(--status-in-review)",
  changes_requested: "var(--status-changes)",
  approved: "var(--status-approved)",
  superseded: "var(--uh-muted)",
};

export function GanttChart({ rows, from, to, today }: { rows: Row[]; from: string; to: string; today: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const fromDate = useMemo(() => startOfDay(new Date(from)), [from]);
  const totalDays = Math.max(7, differenceInCalendarDays(new Date(to), fromDate));
  const width = totalDays * PX_PER_DAY;
  const x = (d: Date | string) => ((typeof d === "string" ? new Date(d) : d).getTime() - fromDate.getTime()) / 86_400_000 * PX_PER_DAY;
  const todayX = x(startOfDay(new Date(today)));

  const [drag, setDrag] = useState<{ id: string; startX: number; dx: number } | null>(null);
  const dragRef = useRef<typeof drag>(null);

  function onPointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const d = { id, startX: e.clientX, dx: 0 };
    dragRef.current = d;
    setDrag(d);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const d = { ...dragRef.current, dx: e.clientX - dragRef.current.startX };
    dragRef.current = d;
    setDrag(d);
  }
  function onPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d) return;
    const days = Math.round(d.dx / PX_PER_DAY);
    if (days === 0) return;
    start(async () => {
      const r = await shiftProjectDates(d.id, days);
      if (r.ok) {
        toast.success(`Moved ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ${days > 0 ? "later" : "earlier"}.`);
        router.refresh();
      } else toast.error(r.error ?? "Could not move project.");
    });
  }

  // Week ticks (Mondays) and month labels.
  const ticks: { x: number; label: string; month?: string }[] = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = addDays(fromDate, i);
    if (isMonday(d) || i === 0) ticks.push({ x: i * PX_PER_DAY, label: format(d, "d"), month: d.getDate() <= 7 || i === 0 ? format(d, "MMM") : undefined });
  }

  const height = HEADER_H + rows.length * ROW_H;

  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="flex">
        {/* Labels */}
        <div className="shrink-0 border-r border-line" style={{ width: LABEL_W }}>
          <div className="hairline-b border-line px-4 text-xs text-slate" style={{ height: HEADER_H, lineHeight: `${HEADER_H}px` }}>
            Project
          </div>
          {rows.map((r) => (
            <div key={r.id} className="hairline-b border-line flex flex-col justify-center px-4 last:border-b-0" style={{ height: ROW_H }}>
              <Link href={`/projects/${r.id}`} className="truncate text-sm font-medium text-ink hover:text-navy">
                {r.name}
              </Link>
              <div className="truncate text-xs text-slate">
                {STATUS_LABEL[r.status]}
                {r.designer ? ` · ${r.designer}` : ""}
                {r.driftDays != null && r.driftDays !== 0 ? (
                  <span className={r.driftDays > 0 ? "text-brand-red" : "text-[var(--status-approved)]"}>
                    {" · "}
                    {Math.abs(r.driftDays)}d {r.driftDays > 0 ? "behind" : "ahead of"} plan
                  </span>
                ) : null}
                {r.extraRounds > 0 ? <span className="text-brand-red"> · +{r.extraRounds} extra round{r.extraRounds === 1 ? "" : "s"}</span> : null}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          <svg width={width} height={height} className="block select-none" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            {/* grid */}
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={t.x} x2={t.x} y1={HEADER_H} y2={height} stroke="var(--uh-line)" strokeWidth={0.5} />
                <text x={t.x + 4} y={HEADER_H - 8} fontSize={11} fill="var(--uh-slate)">
                  {t.month ? `${t.month} ${t.label}` : t.label}
                </text>
              </g>
            ))}
            <line x1={0} x2={width} y1={HEADER_H} y2={HEADER_H} stroke="var(--uh-line)" strokeWidth={0.5} />
            {rows.map((_, i) => (
              <line key={i} x1={0} x2={width} y1={HEADER_H + (i + 1) * ROW_H} y2={HEADER_H + (i + 1) * ROW_H} stroke="var(--uh-line)" strokeWidth={0.5} />
            ))}

            {/* rows */}
            {rows.map((r, i) => {
              const y = HEADER_H + i * ROW_H;
              const s = r.start ? x(r.start) : null;
              const e = r.due ? x(r.due) + PX_PER_DAY : null; // due date inclusive
              const dx = drag?.id === r.id ? drag.dx : 0;
              const barX = (s ?? (e ?? 0) - PX_PER_DAY) + dx;
              const barW = Math.max(PX_PER_DAY, (e ?? (s ?? 0) + PX_PER_DAY) - (s ?? (e ?? 0) - PX_PER_DAY));
              return (
                <g key={r.id}>
                  {/* main bar (draggable) */}
                  <rect
                    x={barX}
                    y={y + 8}
                    width={barW}
                    height={14}
                    rx={4}
                    fill={STATUS_COLOR[r.status]}
                    opacity={drag?.id === r.id ? 0.7 : r.status === "done" || r.status === "cancelled" ? 0.45 : 0.9}
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(ev) => onPointerDown(ev, r.id)}
                  >
                    <title>
                      {r.name}: {r.start ? format(new Date(r.start), "MMM d") : "?"} → {r.due ? format(new Date(r.due), "MMM d") : "?"}. Drag to move.
                    </title>
                  </rect>
                  {r.overdueDays > 0 && e != null ? (
                    <rect x={e + dx} y={y + 8} width={Math.min(r.overdueDays * PX_PER_DAY, todayX - e)} height={14} rx={4} fill="var(--uh-red)" opacity={0.85}>
                      <title>Overdue by {r.overdueDays} days</title>
                    </rect>
                  ) : null}

                  {/* planned segments */}
                  {r.planned.map((seg, j) => {
                    const sx = x(seg.start) + dx;
                    const w = Math.max(2, x(seg.end) - x(seg.start));
                    return (
                      <rect key={j} x={sx} y={y + 27} width={w} height={6} rx={2} fill={SEG_COLOR[seg.kind]} opacity={0.55}>
                        <title>
                          Plan · {seg.label}: {format(new Date(seg.start), "MMM d")} → {format(new Date(seg.end), "MMM d")}
                        </title>
                      </rect>
                    );
                  })}

                  {/* actual rounds */}
                  {r.actual.map((a, j) => {
                    const sx = x(a.start);
                    const w = Math.max(6, x(a.end) - x(a.start));
                    return (
                      <g key={j}>
                        <rect x={sx} y={y + 38} width={w} height={8} rx={2} fill={a.overdue ? "var(--uh-red)" : ROUND_COLOR[a.status]} opacity={a.status === "superseded" ? 0.5 : 0.95}>
                          <title>
                            {a.label} (v{a.versionNumber}) · {a.status.replace("_", " ")}: {format(new Date(a.start), "MMM d")} → {format(new Date(a.end), "MMM d")}
                            {a.overdue ? " · overdue" : ""}
                          </title>
                        </rect>
                        {w > 40 ? (
                          <text x={sx + 4} y={y + 45} fontSize={9} fill="#fff">
                            v{a.versionNumber}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* today */}
            <line x1={todayX} x2={todayX} y1={HEADER_H - 4} y2={height} stroke="var(--uh-red)" strokeWidth={1.5} />
            <text x={todayX + 4} y={HEADER_H - 22} fontSize={10} fill="var(--uh-red)">
              Today
            </text>
          </svg>
        </div>
      </div>
      <div className="hairline-t border-line flex flex-wrap gap-4 px-4 py-2 text-xs text-slate">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-5 rounded bg-navy" /> Project (start → due)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-5 rounded bg-[var(--status-in-review)] opacity-60" /> Planned rounds</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-5 rounded bg-[var(--status-approved)]" /> Actual rounds</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-5 rounded bg-brand-red" /> Overdue</span>
      </div>
    </div>
  );
}
